from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, Dict, Any

from app import crud, schemas
from app.db.session import get_db
from app.services.game_service import game_service

router = APIRouter()


@router.post("/reconnect")
async def reconnect(
    session_token: str,
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Восстановить сессию по session_token.
    Возвращает информацию об игроке и его текущей комнате.
    """
    player = await crud.player.get_by_session_token(db, session_token=session_token)
    if not player:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session token",
        )

    # Получаем комнату игрока
    # Проверяем, что у игрока есть room_id
    if not player.room_id:
        # Игрок не в комнате - это нормальная ситуация, возвращаем информацию об игроке без комнаты
        return {
            "player": {
                "id": player.id,
                "player_id": player.player_id,
                "nickname": player.nickname,
                "role": player.role.value if player.role else None,
                "is_alive": player.is_alive,
                "is_ai": player.is_ai,
                "session_token": player.session_token,
            },
            "room": None,
            "game": None,
            "phase": None,
            "day_number": None,
            "in_room": False,
        }
    
    room = await crud.room.get(db, id=player.room_id)
    if not room:
        # Комната была удалена, но игрок существует
        # Обновляем статус игрока, чтобы он мог создать/присоединиться к новой комнате
        try:
            await crud.player.update(
                db,
                db_obj=player,
                obj_in=schemas.PlayerUpdate(room_id=None, is_connected=False),
            )
        except Exception:
            pass
        
        return {
            "player": {
                "id": player.id,
                "player_id": player.player_id,
                "nickname": player.nickname,
                "role": player.role.value if player.role else None,
                "is_alive": player.is_alive,
                "is_ai": player.is_ai,
                "session_token": player.session_token,
            },
            "room": None,
            "game": None,
            "phase": None,
            "day_number": None,
            "in_room": False,
            "error": "Room was deleted",
        }

    # Получаем текущую игру
    game = await crud.game.get_by_room(db, room_id=player.room_id)

    # Получаем активную машину состояний для комнаты
    machine = game_service.active_machines.get(player.room_id)

    # Обновляем статус подключения
    try:
        await crud.player.update(
            db,
            db_obj=player,
            obj_in=schemas.PlayerUpdate(is_connected=True),
        )
    except Exception:
        pass

    return {
        "player": {
            "id": player.id,
            "player_id": player.player_id,
            "nickname": player.nickname,
            "role": player.role.value if player.role else None,
            "is_alive": player.is_alive,
            "is_ai": player.is_ai,
            "session_token": player.session_token,
        },
        "room": {
            "id": room.id,
            "room_id": room.room_id,
            "status": room.status.value if hasattr(room.status, "value") else room.status,
            "current_players": room.current_players,
            "total_players": room.total_players,
            "ai_count": room.ai_count,
            "people_count": room.people_count,
        },
        "game": {
            "id": game.id if game else None,
            "status": game.status.value if game and hasattr(game.status, "value") else (game.status if game else None),
            "day_number": game.day_number if game else None,
        } if game else None,
        "phase": machine.current_phase.value if machine and machine.current_phase else None,
        "day_number": machine.day_number if machine else None,
    }
