import { useEffect, useState } from 'react'
import './App.css'

function readStoredValue(key, fallback, parseJson = false) {
  try {
    const value = window.localStorage.getItem(key)
    if (value === null) {
      return fallback
    }
    return parseJson ? JSON.parse(value) : value
  } catch (error) {
    console.warn(`Unable to read "${key}" from local storage.`, error)
    return fallback
  }
}

function writeStoredValue(key, value, serializeJson = false) {
  try {
    window.localStorage.setItem(key, serializeJson ? JSON.stringify(value) : value)
  } catch (error) {
    console.warn(`Unable to save "${key}" to local storage.`, error)
  }
}

function App() {
  const [task, setTask] = useState('')
  const [tasks, setTasks] = useState(() => {
    const storedTasks = readStoredValue('todo-tasks', [], true)
    return Array.isArray(storedTasks)
      ? storedTasks.filter(
          (item) =>
            item &&
            typeof item.id === 'string' &&
            typeof item.text === 'string' &&
            typeof item.completed === 'boolean',
        )
      : []
  })
  const [deletingTaskIds, setDeletingTaskIds] = useState([])
  const [isCelebrating, setIsCelebrating] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const [theme, setTheme] = useState(() => {
    const savedTheme = readStoredValue('todo-theme', 'dark')
    return savedTheme === 'light' ? 'light' : 'dark'
  })
  const [isStreakOpen, setIsStreakOpen] = useState(false)
  const [isAccountOpen, setIsAccountOpen] = useState(false)
  const [isShareFormOpen, setIsShareFormOpen] = useState(false)
  const [accomplishment, setAccomplishment] = useState('')
  const [sharedAccomplishments, setSharedAccomplishments] = useState([
    { id: 'maya', name: 'Maya', text: 'Finished my morning run and planned the week!' },
    { id: 'jordan', name: 'Jordan', text: 'Completed a big project milestone today.' },
  ])
  const [streakDays] = useState(() => {
    const savedStreak = Number(readStoredValue('todo-streak', '4'))
    return Number.isInteger(savedStreak) && savedStreak > 0 ? savedStreak : 4
  })
  const [streakProgress] = useState(() => {
    const savedProgress = readStoredValue('todo-streak-progress', null, true)
    if (
      Array.isArray(savedProgress) &&
      savedProgress.length === 7 &&
      savedProgress.every((value) => Number.isFinite(value) && value >= 0)
    ) {
      return savedProgress
    }
    return Array.from({ length: 7 }, (_, index) =>
      Math.max(0, streakDays - (6 - index)),
    )
  })

  const streakHistory = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now)
    date.setDate(now.getDate() - (6 - index))

    return {
      date,
      dayLabel: date.toLocaleDateString(undefined, { weekday: 'short' }),
      value: streakProgress[index],
    }
  })
  const chartPoints = streakHistory
    .map((day, index) => `${28 + index * 39},${100 - day.value * 25}`)
    .join(' ')

  useEffect(() => {
    const timerId = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timerId)
  }, [])

  useEffect(() => {
    const savedTasks = tasks.filter(
      (item) => !item.completed && !deletingTaskIds.includes(item.id),
    )
    writeStoredValue('todo-tasks', savedTasks, true)
  }, [tasks, deletingTaskIds])

  useEffect(() => {
    writeStoredValue('todo-theme', theme)
  }, [theme])

  useEffect(() => {
    writeStoredValue('todo-streak', String(streakDays))
    writeStoredValue(
      'todo-streak-progress',
      streakProgress,
      true,
    )
  }, [streakDays, streakProgress])

  const midnight = new Date(now)
  midnight.setHours(24, 0, 0, 0)
  const secondsUntilMidnight = Math.max(
    0,
    Math.floor((midnight.getTime() - now.getTime()) / 1000),
  )
  const countdownHours = String(Math.floor(secondsUntilMidnight / 3600)).padStart(2, '0')
  const countdownMinutes = String(Math.floor((secondsUntilMidnight % 3600) / 60)).padStart(2, '0')
  const countdownSeconds = String(secondsUntilMidnight % 60).padStart(2, '0')

  function addTask(event) {
    event.preventDefault()
    const trimmedTask = task.trim()

    if (!trimmedTask) {
      return
    }

    setTasks((currentTasks) => [
      ...currentTasks,
      { id: crypto.randomUUID(), text: trimmedTask, completed: false },
    ])
    setTask('')
  }

  function toggleTask(id) {
    const updatedTasks = tasks.map((item) =>
      item.id === id ? { ...item, completed: !item.completed } : item,
    )
    setTasks(updatedTasks)
    writeStoredValue(
      'todo-tasks',
      updatedTasks.filter((item) => !item.completed),
      true,
    )

    if (updatedTasks.length > 0 && updatedTasks.every((item) => item.completed)) {
      setIsCelebrating(true)
    }
  }

  function deleteTask(id) {
    setDeletingTaskIds((currentIds) => [...currentIds, id])
    writeStoredValue(
      'todo-tasks',
      tasks.filter((item) => item.id !== id && !item.completed),
      true,
    )
  }

  function finishDeletingTask(id) {
    setTasks((currentTasks) => currentTasks.filter((item) => item.id !== id))
    setDeletingTaskIds((currentIds) => currentIds.filter((taskId) => taskId !== id))
  }

  function shareAccomplishment(event) {
    event.preventDefault()
    const trimmedAccomplishment = accomplishment.trim()

    if (!trimmedAccomplishment) {
      return
    }

    setSharedAccomplishments((currentPosts) => [
      { id: crypto.randomUUID(), name: 'Link', text: trimmedAccomplishment },
      ...currentPosts,
    ])
    setAccomplishment('')
    setIsShareFormOpen(false)
  }

  return (
    <main className={`todo-app theme-${theme}`}>
      <nav className="tracker-nav" aria-label="Progress tracking">
        <div className="tracker-streak-wrap">
          <button
            className="tracker-streak"
            type="button"
            aria-expanded={isStreakOpen}
            aria-controls="streak-progress"
            onClick={() => setIsStreakOpen((isOpen) => !isOpen)}
          >
            <span className="tracker-flame" aria-hidden="true">🔥</span>
            <span><strong>{streakDays}</strong> day streak</span>
          </button>
          {isStreakOpen && (
            <section className="streak-popover" id="streak-progress" aria-labelledby="streak-chart-title">
              <div className="streak-popover-heading">
                <div>
                  <h2 id="streak-chart-title">Streak progression</h2>
                  <p>Last 7 days</p>
                </div>
                <button
                  className="streak-popover-close"
                  type="button"
                  aria-label="Close streak progression"
                  onClick={() => setIsStreakOpen(false)}
                >
                  &times;
                </button>
              </div>
              <svg
                className="streak-chart"
                viewBox="0 0 280 116"
                role="img"
                aria-label={`Current streak is ${streakDays} days`}
              >
                {[0, 1, 2, 3, 4].map((value) => {
                  const y = 100 - value * 25
                  return (
                    <g key={value}>
                      <line x1="26" x2="266" y1={y} y2={y} className="chart-grid-line" />
                      <text x="16" y={y + 3} className="chart-axis-label">{value}</text>
                    </g>
                  )
                })}
                <polyline points={chartPoints} className="chart-line" />
                {streakHistory.map((day, index) => (
                  <circle
                    key={day.date.toISOString()}
                    cx={28 + index * 39}
                    cy={100 - day.value * 25}
                    r="3.5"
                    className="chart-point"
                  />
                ))}
              </svg>
              <div className="chart-day-labels">
                {streakHistory.map((day) => (
                  <span key={day.date.toISOString()}>{day.dayLabel}</span>
                ))}
              </div>
              <p className="streak-chart-caption">Consecutive active days</p>
            </section>
          )}
        </div>
        <div className="tracker-account-wrap">
          <button
            className="tracker-account"
            type="button"
            aria-expanded={isAccountOpen}
            aria-controls="account-details"
            onClick={() => setIsAccountOpen((isOpen) => !isOpen)}
          >
            <svg
              className="account-avatar"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="12" fill="#477b55" />
              <path
                d="M7.2 20.7c.4-3.3 2.2-5.4 4.8-5.4s4.4 2.1 4.8 5.4"
                fill="#d9e9aa"
              />
              <circle cx="12" cy="9.1" r="3.3" fill="#f0d2ad" />
            </svg>
            <span>Link</span>
          </button>
          {isAccountOpen && (
            <section
              className="account-popover"
              id="account-details"
              aria-labelledby="account-name"
            >
              <div className="account-popover-heading">
                <div className="account-profile-avatar" aria-hidden="true">
                  <svg viewBox="0 0 48 48">
                    <circle cx="24" cy="24" r="24" fill="#477b55" />
                    <path d="M12 43c.8-7 5.2-11.5 12-11.5S35.2 36 36 43" fill="#d9e9aa" />
                    <circle cx="24" cy="19" r="7" fill="#f0d2ad" />
                    <path d="m12 14 4-9 8 3 8-3 4 9-4-2-2-4-6 3-6-3-2 4Z" fill="#e6c64c" />
                  </svg>
                </div>
                <div>
                  <h2 id="account-name">Link Hyrule</h2>
                  <p>Adventurer</p>
                </div>
                <button
                  className="streak-popover-close"
                  type="button"
                  aria-label="Close account information"
                  onClick={() => setIsAccountOpen(false)}
                >
                  &times;
                </button>
              </div>

              <dl className="account-details-list">
                <div>
                  <dt>Age</dt>
                  <dd>21</dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>link@hyrule.example</dd>
                </div>
                <div>
                  <dt>Full name</dt>
                  <dd>Link Hyrule</dd>
                </div>
              </dl>

              <div className="account-badges">
                <h3>Badges</h3>
                <ul>
                  <li>
                    <span className="badge-medal badge-gold" aria-hidden="true">★</span>
                    <span>Gold <small>Focus Master</small></span>
                  </li>
                  <li>
                    <span className="badge-medal badge-silver" aria-hidden="true">★</span>
                    <span>Silver <small>Task Tamer</small></span>
                  </li>
                  <li>
                    <span className="badge-medal badge-bronze" aria-hidden="true">★</span>
                    <span>Bronze <small>Getting Started</small></span>
                  </li>
                </ul>
              </div>
            </section>
          )}
        </div>
        <button
          className="theme-toggle"
          type="button"
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          aria-pressed={theme === 'dark'}
          onClick={() => setTheme((currentTheme) => currentTheme === 'dark' ? 'light' : 'dark')}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              className="bulb-glass"
              d="M9 16.5c-.3-1.1-.8-1.8-1.6-2.6a6.5 6.5 0 1 1 9.2 0c-.8.8-1.3 1.5-1.6 2.6Z"
            />
            <path className="bulb-base" d="M9 17h6m-5 3h4m-3 2h2" />
          </svg>
        </button>
      </nav>
      <div className="dashboard-layout">
        <section className="todo-card" aria-labelledby="todo-title">
          <p className="eyebrow">A simple place to start</p>
          <h1 id="todo-title">My todo list</h1>
          <p className="intro">Keep track of what needs to get done.</p>

          <form className="add-task-form" onSubmit={addTask}>
            <label htmlFor="task-input">New task</label>
            <div className="input-row">
              <input
                id="task-input"
                type="text"
                value={task}
                onChange={(event) => setTask(event.target.value)}
                placeholder="What do you need to do?"
              />
              <button type="submit">Add</button>
            </div>
          </form>

          <div className="task-section">
            <h2>Tasks</h2>
            {tasks.length === 0 ? (
              <p className="empty-state">Your tasks will appear here.</p>
            ) : (
              <ul className="task-list">
                {tasks.map((item) => {
                  const isDeleting = deletingTaskIds.includes(item.id)

                  return (
                    <li
                      key={item.id}
                      className={`task-item${isDeleting ? ' is-deleting' : ''}`}
                      onAnimationEnd={(event) => {
                        if (event.animationName === 'task-puff') {
                          finishDeletingTask(item.id)
                        }
                      }}
                    >
                      <label>
                        <input
                          type="checkbox"
                          checked={item.completed}
                          disabled={isDeleting}
                          onChange={() => toggleTask(item.id)}
                        />
                        <span className={item.completed ? 'completed' : ''}>
                          {item.text}
                        </span>
                      </label>
                      <button
                        className="delete-task"
                        type="button"
                        aria-label={`Delete ${item.text}`}
                        disabled={isDeleting}
                        onClick={() => deleteTask(item.id)}
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M4 7h16M10 11v6m4-6v6M5.5 7l1 14h11l1-14M9 7V4h6v3" />
                        </svg>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </section>

        <aside className="date-widgets" aria-label="Date and time">
          <section className="date-card" aria-label="Today's date and time">
            <div className="calendar-heading">
              <span className="calendar-icon" aria-hidden="true">
                <span />
              </span>
              <span>{now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span>
            </div>
            <div className="calendar-date">
              <span className="calendar-weekday">
                {now.toLocaleDateString(undefined, { weekday: 'long' })}
              </span>
              <strong>{now.getDate()}</strong>
              <time dateTime={now.toISOString()}>
                {now.toLocaleTimeString(undefined, {
                  hour: 'numeric',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </time>
            </div>
          </section>

          <section className="countdown-card" aria-label="Time remaining today">
            <p className="countdown-label">Time left today</p>
            <time className="countdown-time">
              {countdownHours}:{countdownMinutes}:{countdownSeconds}
            </time>
            <p className="countdown-caption">until the end of the day</p>
          </section>

          <section className="accomplishments-card" aria-labelledby="accomplishments-title">
            <div className="accomplishments-heading">
              <div>
                <h2 id="accomplishments-title">Community wins</h2>
                <p>A little progress adds up.</p>
              </div>
              <span aria-hidden="true">✦</span>
            </div>
            <ul className="accomplishment-list" aria-live="polite">
              {sharedAccomplishments.map((post) => (
                <li key={post.id}>
                  <span className="accomplishment-avatar" aria-hidden="true">
                    {post.name.slice(0, 1)}
                  </span>
                  <div>
                    <strong>{post.name}</strong>
                    <p>{post.text}</p>
                  </div>
                </li>
              ))}
            </ul>
            {isShareFormOpen && (
              <form className="share-form" onSubmit={shareAccomplishment}>
                <label htmlFor="accomplishment-input">What did you accomplish?</label>
                <textarea
                  id="accomplishment-input"
                  value={accomplishment}
                  onChange={(event) => setAccomplishment(event.target.value)}
                  placeholder="Share a small win..."
                  maxLength={120}
                  rows={3}
                  autoFocus
                />
                <div className="share-form-actions">
                  <button
                    className="share-cancel"
                    type="button"
                    onClick={() => {
                      setIsShareFormOpen(false)
                      setAccomplishment('')
                    }}
                  >
                    Cancel
                  </button>
                  <button className="share-submit" type="submit">Post</button>
                </div>
              </form>
            )}
            {!isShareFormOpen && (
              <button
                className="share-button"
                type="button"
                onClick={() => setIsShareFormOpen(true)}
              >
                <span aria-hidden="true">↗</span>
                Share a win
              </button>
            )}
          </section>
        </aside>
      </div>
      {isCelebrating && (
        <div className="celebration-overlay">
          <div className="celebration-confetti" aria-hidden="true">
            {Array.from({ length: 14 }, (_, index) => (
              <span
                key={index}
                style={{
                  left: `${(index * 37) % 100}%`,
                  top: `${(index * 19) % 82}%`,
                  animationDelay: `${(index % 8) * -0.18}s`,
                }}
              />
            ))}
          </div>
          <section
            className="celebration-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="celebration-title"
          >
            <span className="celebration-icon" aria-hidden="true">🎉</span>
            <p className="celebration-eyebrow">All done!</p>
            <h2 id="celebration-title">You completed every task!</h2>
            <p className="celebration-message">
              That’s a great feeling. Take a moment to celebrate your progress.
            </p>
            <button
              className="celebration-dismiss"
              type="button"
              onClick={() => setIsCelebrating(false)}
            >
              Keep it up
            </button>
          </section>
        </div>
      )}
    </main>
  )
}

export default App