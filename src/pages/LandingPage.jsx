import React, { useState, useContext, useEffect } from 'react'
import './LandingPage.css'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../contexts/AuthContext.jsx'
import axios from 'axios'

const client = axios.create({ baseURL: "http://localhost:8000/api/v1/users" });

export default function LandingPage() {
  const navigate = useNavigate()
  const { userData, handleLogout } = useContext(AuthContext)
  const [joinCode, setJoinCode] = useState('')
  const [history, setHistory] = useState([])

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await client.get('/get_all_activity', {
          headers: { Authorization: `Bearer ${token}` }
        })
        setHistory(res.data)
      } catch (err) {
        console.log('No history yet')
      }
    }
    fetchHistory()
  }, [])

  const startMeeting = async () => {
    const roomId = Math.random().toString(36).substring(2, 9)
    try {
      const token = localStorage.getItem('token')
      await client.post('/add_to_activity', { meeting_code: roomId }, {
        headers: { Authorization: `Bearer ${token}` }
      })
    } catch (err) { console.log(err) }
    navigate(`/meeting/${roomId}`)
  }

  const joinMeeting = () => {
    if (joinCode.trim() !== '') navigate(`/meeting/${joinCode.trim()}`)
  }

  return (
    <div className="landing">

      {/* NAVBAR */}
      <nav className="navbar">
        <h2 className="logo">MyZoom</h2>
        <ul className="nav-links">
          <li>Home</li>
          <li>Features</li>
          <li>Contact</li>
        </ul>
        <div className="nav-right">
          <span className="welcome-text">👋 {userData?.name || userData?.username || 'User'}</span>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <div className="main-content">

        {/* LEFT — Hero + Actions */}
        <div className="left-panel">
          <h1>Connect with your<br />loved ones</h1>
          <p>Modern video conferencing with speed and simplicity</p>

          {/* ACTION ROW */}
          <div className="action-row">

            {/* Start Meeting */}
            <div className="action-card">
              <div className="action-icon">🎥</div>
              <div className="action-info">
                <h3>New Meeting</h3>
                <p>Start an instant meeting</p>
              </div>
              <button className="action-btn" onClick={startMeeting}>Start</button>
            </div>

            {/* Join Meeting */}
            <div className="action-card">
              <div className="action-icon">🔗</div>
              <div className="action-info">
                <h3>Join Meeting</h3>
                <p>Enter a room code</p>
              </div>
              <div className="join-group">
                <input
                  type="text"
                  placeholder="Room code..."
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && joinMeeting()}
                  className="join-input"
                />
                <button className="action-btn" onClick={joinMeeting}>Join</button>
              </div>
            </div>

          </div>
        </div>

        {/* RIGHT — Meeting History */}
        <div className="right-panel">
          <h2>Recent Meetings</h2>
          {history.length === 0 ? (
            <div className="no-history">
              <span>📭</span>
              <p>No meetings yet.<br />Start your first one!</p>
            </div>
          ) : (
            <div className="history-list">
              {history.map((item, index) => (
                <div className="history-item" key={index}>
                  <div className="history-info">
                    <p className="history-code">🔑 {item.meeting_code}</p>
                    <p className="history-date">{new Date(item.date).toLocaleString()}</p>
                  </div>
                  <button className="rejoin-btn" onClick={() => navigate(`/meeting/${item.meeting_code}`)}>
                    Rejoin
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}