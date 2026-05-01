/**
 * useSocket.js - Socket.IO event listener hook
 * Registers all server-to-client events and updates Zustand store.
 * Navigation events are handled locally in each page component.
 */
import { useEffect } from 'react'
import socket from '../socket'
import useGameStore from '../store/gameStore'

export default function useSocket() {
  const {
    setRoom,
    setGameStarted,
    setGameState,
    setDiceResult,
    pushEvents,
    setEndGameData,
    setDangerMode,
    setAlmostCut,
  } = useGameStore()

  useEffect(() => {
    const onRoomUpdate  = ({ room }) => setRoom(room)
    const onStateUpdate = ({ state, events }) => {
      setGameState(state)
      if (events?.length) {
        pushEvents(events)
        setDangerMode(events.some(e => e.type === 'danger'))
        if (events.some(e => e.type === 'almost_cut')) setAlmostCut(true)
      }
    }
    const onDiceResult = (data) => {
      setDiceResult(data)
      if (data.events?.length) pushEvents(data.events)
    }

    socket.on('roomUpdate',  onRoomUpdate)
    socket.on('stateUpdate', onStateUpdate)
    socket.on('diceResult',  onDiceResult)

    return () => {
      socket.off('roomUpdate',  onRoomUpdate)
      socket.off('stateUpdate', onStateUpdate)
      socket.off('diceResult',  onDiceResult)
    }
  }, [setRoom, setGameState, setDiceResult, pushEvents, setDangerMode, setAlmostCut, setGameStarted, setEndGameData])
}
