from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app import crud, schemas
from app.db.session import get_db
from app.websocket.manager import manager

router = APIRouter()


@router.post("/me/register", response_model=schemas.Player)
async def register_player(
    registration_data: schemas.PlayerRegister,
    db: AsyncSession = Depends(get_db),
) -> schemas.Player:
    """
    Зарегистрировать никнейм игрока.
    Используется при первом входе, когда игрок еще не имеет никнейма.
    """
    player = await crud.player.get_by_session_token(
        db, session_token=registration_data.session_token
    )
    if not player:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Player not found",
        )
    
    # Проверяем, что никнейм еще не установлен
    if player.nickname and not player.nickname.startswith("Player_"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Player already has a nickname",
        )
    
    # Обновляем никнейм
    player = await crud.player.update(
        db,
        db_obj=player,
        obj_in=schemas.PlayerUpdate(nickname=registration_data.nickname),
    )
    
    return player


@router.get("/me", response_model=schemas.Player)
async def get_current_player(
    session_token: str,
    db: AsyncSession = Depends(get_db),
) -> schemas.Player:
    """
    Получить текущего игрока по session_token.
    Используется для проверки статуса игрока на главном экране.
    """
    player = await crud.player.get_by_session_token(db, session_token=session_token)
    if not player:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Player not found",
        )
    return player


@router.get("/me/room")
async def get_current_player_room(
    session_token: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Получить информацию о комнате текущего игрока.
    Возвращает информацию о комнате, если игрок в ней находится.
    Также возвращает флаг is_registered, указывающий, зарегистрирован ли игрок (имеет ли никнейм).
    """
    player = await crud.player.get_by_session_token(db, session_token=session_token)
    if not player:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Player not found",
        )
    
    # Проверяем, зарегистрирован ли игрок (имеет ли никнейм отличный от временного)
    is_registered = bool(player.nickname and not player.nickname.startswith("Player_"))
    
    # Получаем комнату
    room = await crud.room.get(db, id=player.room_id)
    if not room:
        return {
            "in_room": False,
            "room_id": None,
            "short_id": None,
            "room_name": None,
            "status": None,
            "is_registered": is_registered,
        }
    
    return {
        "in_room": True,
        "room_id": room.room_id,
        "short_id": room.short_id,
        "room_name": room.short_id,
        "status": room.status,
        "is_registered": is_registered,
    }


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def leave_game(
    session_token: str,
    db: AsyncSession = Depends(get_db),
) -> None:
    """
    Покинуть текущую игру (выйти из комнаты).
    Игрок удаляется из комнаты и базы данных.
    """
    player = await crud.player.get_by_session_token(db, session_token=session_token)
    if not player:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Player not found",
        )
    
    room = await crud.room.get(db, id=player.room_id)
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found",
        )
    
    # Отключаем игрока от WebSocket
    await manager.disconnect_player(player.id)
    
    # Уведомляем остальных игроков
    await manager.broadcast_to_room(
        room.id,
        {
            "type": "player_left",
            "player_id": player.id,
            "nickname": player.nickname,
        },
    )
    
    # Удаляем игрока из БД
    await crud.player.delete(db, id=player.id)
    
    # Обновляем счётчик игроков в комнате
    new_count = max(0, room.current_players - 1)
    human_delta = 0 if player.is_ai else 1
    ai_delta = 1 if player.is_ai else 0
    await crud.room.update(
        db,
        db_obj=room,
        obj_in=schemas.RoomUpdate(
            current_players=new_count,
            human_players=max(0, room.human_players - human_delta),
            ai_players=max(0, room.ai_players - ai_delta),
        ),
    )


@router.get("/{player_id}", response_model=schemas.Player)
async def get_player(
    player_id: int,
    db: AsyncSession = Depends(get_db),
) -> schemas.Player:
    """
    Получить публичный профиль игрока по его внутреннему ID.
    """
    player = await crud.player.get(db, id=player_id)
    if not player:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Player not found",
        )
    return player
