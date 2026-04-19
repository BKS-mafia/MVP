import asyncio
import json
import logging
import random
import uuid
from typing import Dict, List, Optional, Any
from sqlalchemy.ext.asyncio import AsyncSession

from app.game.state_machine import StateMachine, GamePhase
from app.websocket.manager import ConnectionManager
from app.crud.room import RoomCRUD
from app.crud.player import PlayerCRUD
from app.crud.game import GameCRUD
from app import schemas
from app.models.room import Room as RoomModel, RoomStatus
from app.models.game import Game as GameModel
from app.models.player import Player as PlayerModel

logger = logging.getLogger(__name__)


class GameService:
    def __init__(
        self,
        room_crud: RoomCRUD,
        player_crud: PlayerCRUD,
        game_crud: GameCRUD,
        ws_manager: ConnectionManager,
    ):
        self.room_crud = room_crud
        self.player_crud = player_crud
        self.game_crud = game_crud
        self.ws_manager = ws_manager
        self.active_machines: Dict[int, StateMachine] = {}
        self.tasks: Dict[int, asyncio.Task] = {}
        self.ready_players: Dict[int, set] = {}
        self._phase_timers: Dict[int, asyncio.Task] = {}
        self._timer_broadcast_tasks: Dict[int, asyncio.Task] = {}
        
        # Загружаем список имён для AI игроков
        self._ai_names: List[str] = self._load_ai_names()
        
        # Устанавливаем ws_manager в AI сервис
        self._setup_ai_service()
    
    def _setup_ai_service(self):
        from app.services.ai_service import ai_service
        ai_service.set_ws_manager(self.ws_manager)
    
    def _load_ai_names(self) -> List[str]:
        try:
            with open(os.path.join(os.path.dirname(__file__), os.pardir, 'app', 'ai', 'names.json'), 'r', encoding='utf-8') as f:
                names = json.load(f)
                logger.info(f'Загружено {len(names)} имён для AI игроков')
                return names
        except FileNotFoundError:
            logger.warning('Файл names.json не найден, используем резервные имена')
            return []
        except Exception as e:
            logger.error(f'Ошибка чтения names.json: {e}')
            return []
    
    def _get_random_ai_name(self, occupied_nicknames: set) -> str:
        available_names = [n for n in self._ai_names if n not in occupied_nicknames]
        
        if available_names:
            return random.choice(available_names)
        
        return f'Player_{random.randint(10000, 99999)}'

    async def _fill_with_ai_players(
        self,
        db: AsyncSession,
        room: RoomModel,
        existing_players: List[PlayerModel],
    ) -> List[PlayerModel]:
        needed: int = room.total_players - len(existing_players)
        if needed <= 0:
            logger.debug(
                f'Комната {room.id}: дозаполнение AI-игроками не требуется '
                f'({len(existing_players)}/{room.total_players})'
            )
            return []

        occupied_nicknames: set = {p.nickname for p in existing_players}
        created_ai_players: List[PlayerModel] = []

        for _ in range(needed):
            nickname: str = self._get_random_ai_name(occupied_nicknames)
            occupied_nicknames.add(nickname)

            player_create = schemas.PlayerCreate(
                player_id=str(uuid.uuid4()),
                room_id=room.id,
                nickname=nickname,
                is_ai=True,
                is_alive=True,
                is_connected=False,
                session_token=str(uuid.uuid4()),
            )

            try:
                ai_player: PlayerModel = await self.player_crud.create(
                    db, obj_in=player_create
                )
                created_ai_players.append(ai_player)
                logger.info(
                    f'Создан AI-игрок {nickname} (id={ai_player.id}) для комнаты {room.id}'
                )
            except Exception as exc:
                logger.error(
                    f'Ошибка создания AI-игрока {nickname} для комнаты {room.id}: {exc}'
                )
                raise

        if created_ai_players:
            new_total: int = len(existing_players) + len(created_ai_players)
            new_ai_count: int = room.ai_players + len(created_ai_players)
            await self.room_crud.update(
                db,
                db_obj=room,
                obj_in=schemas.RoomUpdate(
                    current_players=new_total,
                    ai_players=new_ai_count,
                ),
            )
            logger.info(
                f'Комната {room.id}: добавлено {len(created_ai_players)} AI-игроков. '
                f'Итого игроков: {new_total}/{room.total_players}'
            )

        return created_ai_players

    async def start_game_for_room(
        self,
        db: AsyncSession,
        room_id: int,
    ) -> Dict[str, Any]:
        room = await self.room_crud.get(db, id=room_id)
        if not room:
            raise ValueError(f'Комната {room_id} не найдена')
        if room.status not in (RoomStatus.LOBBY, RoomStatus.STARTING):
            raise ValueError(f'Комната не в статусе lobby/starting (статус: {room.status})')

        players: List[PlayerModel] = await self.player_crud.get_by_room(
            db, room_id=room_id
        )
        if len(players) < room.total_players:
            ai_players_added: List[PlayerModel] = await self._fill_with_ai_players(
                db, room, players
            )
            if ai_players_added:
                players = await self.player_crud.get_by_room(db, room_id=room_id)
                updated_room = await self.room_crud.get(db, id=room_id)
                if updated_room:
                    room = updated_room

        await self.room_crud.update(
            db,
            db_obj=room,
            obj_in=schemas.RoomUpdate(status='playing'),
        )

        game = await self.game_crud.create(
            db,
            obj_in=schemas.GameCreate(
                room_id=room_id,
                status='lobby',
                day_number=1,
            ),
        )

        from app.services.ai_service import ai_service
        from app.ai.mcp_tools import MCPToolDispatcher
        from app.db.session import AsyncSessionLocal
        
        async with AsyncSessionLocal() as machine_db:
            mcp_dispatcher = MCPToolDispatcher()
            machine = StateMachine(
                room_id=room_id,
                db=machine_db,
                ws_manager=self.ws_manager,
                game_id=game.id,
                ai_service=ai_service,
                mcp_dispatcher=mcp_dispatcher
            )
            self.active_machines[room_id] = machine
            machine.game_service = self

            asyncio.create_task(machine.start())
        logger.info(f'State Machine запущена для комнаты {room_id}')

        await self.ws_manager.broadcast_to_room(
            room_id,
            {
                'type': 'game_started',
                'room_id': room_id,
                'game_id': game.id,
                'message': 'Игра началась! Распределение ролей...',
            },
        )

        return {
            'room_id': room_id,
            'game_id': game.id,
            'machine': machine,
            'message': 'Игра успешно начата',
        }

    async def stop_game_for_room(
        self,
        db: AsyncSession,
        room_id: int,
    ) -> Dict[str, Any]:
        machine = self.active_machines.get(room_id)
        if not machine:
            raise ValueError(f'Активная игра в комнате {room_id} не найдена')

        await machine.stop()
        del self.active_machines[room_id]

        task = self.tasks.get(room_id)
        if task:
            task.cancel()
            del self.tasks[room_id]
        self.cancel_phase_timer(room_id)

        room = await self.room_crud.get(db, id=room_id)
        if room:
            await self.room_crud.update(
                db,
                db_obj=room,
                obj_in=schemas.RoomUpdate(status='finished'),
            )

        game = await self.game_crud.get_by_room(db, room_id=room_id)
        if game:
            await self.game_crud.update(
                db,
                db_obj=game,
                obj_in=schemas.GameUpdate(status='finished', winner='aborted'),
            )

        await self.ws_manager.broadcast_to_room(
            room_id,
            {
                'type': 'game_stopped',
                'room_id': room_id,
                'message': 'Игра досрочно завершена.',
            },
        )

        logger.info(f'Игра в комнате {room_id} остановлена')
        return {'room_id': room_id, 'message': 'Игра остановлена'}

    async def submit_night_action(
        self,
        db: AsyncSession,
        room_id: int,
        player_id: int,
        action: Dict[str, Any],
    ) -> Dict[str, Any]:
        machine = self.active_machines.get(room_id)
        if not machine:
            raise ValueError(f'Активная игра в комнате {room_id} не найдена')

        if machine.current_phase != GamePhase.NIGHT:
            raise ValueError('Ночные действия принимаются только в ночной фазе')

        machine.night_actions[player_id] = action
        logger.info(f'Ночное действие от игрока {player_id} в комнате {room_id}: {action}')

        await self.ws_manager.send_to_player(
            player_id,
            {
                'type': 'night_action_accepted',
                'player_id': player_id,
                'action': action,
            },
        )

        return {
            'player_id': player_id,
            'action': action,
            'message': 'Ночное действие принято',
        }

    async def submit_vote(
        self,
        db: AsyncSession,
        room_id: int,
        voter_id: int,
        target_player_id: int,
    ) -> Dict[str, Any]:
        machine = self.active_machines.get(room_id)
        if not machine:
            raise ValueError(f'Активная игра в комнате {room_id} не найдена')

        if machine.current_phase != GamePhase.VOTING:
            raise ValueError('Голосование возможно только в фазе голосования')

        voter = await self.player_crud.get(db, id=voter_id)
        if not voter or not voter.is_alive:
            raise ValueError('Голосующий мёртв или не существует')

        target = await self.player_crud.get(db, id=target_player_id)
        if not target or not target.is_alive:
            raise ValueError('Цель голосования мертва или не существует')

        machine.votes[voter_id] = target_player_id
        logger.info(f'Голос от игрока {voter_id} за {target_player_id} в комнате {room_id}')

        await self.ws_manager.broadcast_to_room(
            room_id,
            {
                'type': 'vote_received',
                'voter_id': voter_id,
                'target_player_id': target_player_id,
            },
        )

        return {
            'voter_id': voter_id,
            'target_player_id': target_player_id,
            'message': 'Голос принят',
        }

    async def get_game_state(
        self,
        db: AsyncSession,
        room_id: int,
    ) -> Dict[str, Any]:
        machine = self.active_machines.get(room_id)
        if not machine:
            raise ValueError(f'Активная игра в комнате {room_id} не найдена')

        players = await self.player_crud.get_by_room(db, room_id=room_id)
        game = await self.game_crud.get_by_room(db, room_id=room_id)

        return {
            'room_id': room_id,
            'phase': machine.current_phase.value if machine.current_phase else None,
            'day_number': machine.day_number,
            'night_actions': machine.night_actions,
            'votes': machine.votes,
            'players': [
                {
                    'id': p.id,
                    'nickname': p.nickname,
                    'role': p.role,
                    'is_alive': p.is_alive,
                    'is_ai': p.is_ai,
                }
                for p in players
            ],
            'game': game,
        }

    async def force_phase_transition(
        self,
        db: AsyncSession,
        room_id: int,
        target_phase: GamePhase,
    ) -> Dict[str, Any]:
        machine = self.active_machines.get(room_id)
        if not machine:
            raise ValueError(f'Активная игра в комнате {room_id} не найдена')

        old_phase = machine.current_phase
        machine.current_phase = target_phase
        logger.info(f'Принудительный переход фазы в комнате {room_id}: {old_phase} -> {target_phase}')

        await self.ws_manager.broadcast_to_room(
            room_id,
            {
                'type': 'phase_changed',
                'old_phase': old_phase.value if old_phase else None,
                'new_phase': target_phase.value,
                'room_id': room_id,
            },
        )

        return {
            'room_id': room_id,
            'old_phase': old_phase.value if old_phase else None,
            'new_phase': target_phase.value,
        }

    async def _phase_timer(self, room_id: int, phase: str, duration_seconds: int):
        try:
            await asyncio.sleep(duration_seconds)

            state_machine = self.active_machines.get(room_id)
            if state_machine is None:
                return

            current_phase_value = (
                state_machine.current_phase.value
                if hasattr(state_machine.current_phase, 'value')
                else str(state_machine.current_phase)
            )
            if current_phase_value != phase:
                return

            logger.info(
                f'Phase timer expired for room {room_id}, phase={phase}. '
                'Forcing advance.'
            )
            await state_machine.force_advance_phase()

        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f'Phase timer error for room {room_id}: {e}')

    async def _broadcast_timer_updates(self, room_id: int) -> None:
        try:
            while True:
                await asyncio.sleep(1)
                
                machine = self.active_machines.get(room_id)
                if machine is None:
                    break
                
                if room_id not in self._phase_timers:
                    break
                
                await machine._broadcast_phase_timer()
                
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f'Broadcast timer update error for room {room_id}: {e}')

    def start_phase_timer(
        self, room_id: int, phase: str, duration_seconds: int = None
    ) -> asyncio.Task:
        DEFAULT_DURATIONS = {
            'night': 60,
            'day': 120,
            'voting': 60,
            'turing_test': 90,
        }

        if duration_seconds is None:
            duration_seconds = DEFAULT_DURATIONS.get(phase, 60)

        self.cancel_phase_timer(room_id)

        machine = self.active_machines.get(room_id)
        if machine:
            machine.reset_phase_timer(duration_seconds)
            old_broadcast = self._timer_broadcast_tasks.get(room_id)
            if old_broadcast and not old_broadcast.done():
                old_broadcast.cancel()
            broadcast_task = asyncio.create_task(self._broadcast_timer_updates(room_id))
            self._timer_broadcast_tasks[room_id] = broadcast_task

        task = asyncio.create_task(
            self._phase_timer(room_id, phase, duration_seconds)
        )
        self._phase_timers[room_id] = task
        logger.debug(
            f'Phase timer started for room {room_id}, phase={phase}, '
            f'duration={duration_seconds}s'
        )
        return task

    def cancel_phase_timer(self, room_id: int) -> None:
        existing = self._phase_timers.get(room_id)
        if existing and not existing.done():
            existing.cancel()
        self._phase_timers.pop(room_id, None)
        
        broadcast_task = self._timer_broadcast_tasks.get(room_id)
        if broadcast_task and not broadcast_task.done():
            broadcast_task.cancel()
        self._timer_broadcast_tasks.pop(room_id, None)

    async def cleanup_room(self, room_id: int):
        machine = self.active_machines.pop(room_id, None)
        if machine:
            await machine.stop()
        task = self.tasks.pop(room_id, None)
        if task:
            task.cancel()
        self.cancel_phase_timer(room_id)
        logger.info(f'Ресурсы игры для комнаты {room_id} очищены')


# Глобальный экземпляр сервиса
import os
from app.websocket.manager import manager as ws_manager
from app.crud.game import GameCRUD as GameCRUDClass

room_crud = RoomCRUD()
player_crud = PlayerCRUD()
try:
    game_crud = GameCRUDClass()
except Exception:
    class GameCRUD:
        async def create(self, db, obj_in):
            return None
        async def get_by_room(self, db, room_id):
            return None
        async def update(self, db, db_obj, obj_in):
            return db_obj
    game_crud = GameCRUD()

game_service = GameService(room_crud, player_crud, game_crud, ws_manager)