import { useState, useEffect } from 'react'
import './App.css'

const decodeHTML = (html) => {
  const txt = document.createElement('textarea')
  txt.innerHTML = html
  return txt.value
}

const shuffleArray = (array) => {
  const newArray = [...array]
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]]
  }
  return newArray
}

function App() {
  // --- STATE UTAMA ---
  const [user, setUser] = useState(() => localStorage.getItem('quiz_user') || '')
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userAnswers, setUserAnswers] = useState([])
  const [timer, setTimer] = useState(60) // Waktu kuis misal 60 detik
  const [quizStatus, setQuizStatus] = useState('LOGIN') // 'LOGIN', 'PLAYING', 'FINISHED'
  const [loading, setLoading] = useState(false)
  const [usernameInput, setUsernameInput] = useState('')

  const API_URL = 'https://opentdb.com/api.php?amount=10&category=27&difficulty=medium&type=multiple'

  // --- (LOCALSTORAGE) ---
  useEffect(() => {
    const savedStatus = localStorage.getItem('quiz_status')
    if (savedStatus === 'PLAYING') {
      const savedQuestions = JSON.parse(localStorage.getItem('quiz_questions'))
      const savedIndex = parseInt(localStorage.getItem('quiz_index'), 10)
      const savedAnswers = JSON.parse(localStorage.getItem('quiz_answers'))
      const savedTimer = parseInt(localStorage.getItem('quiz_timer'), 10)

      if (savedQuestions && savedQuestions.length > 0) {
        setQuestions(savedQuestions)
        setCurrentIndex(savedIndex || 0)
        setUserAnswers(savedAnswers || [])
        setTimer(savedTimer > 0 ? savedTimer : 60)
        setQuizStatus('PLAYING')
      }
    }
  }, [])

  // Menyimpan state ke localStorage tiap kali ada perubahan saat bermain
  useEffect(() => {
    if (quizStatus === 'PLAYING') {
      localStorage.setItem('quiz_status', 'PLAYING')
      localStorage.setItem('quiz_questions', JSON.stringify(questions))
      localStorage.setItem('quiz_index', currentIndex.toString())
      localStorage.setItem('quiz_answers', JSON.stringify(userAnswers))
      localStorage.setItem('quiz_timer', timer.toString())
    } else if (quizStatus === 'FINISHED') {
      localStorage.setItem('quiz_status', 'FINISHED')
    }
  }, [quizStatus, currentIndex, userAnswers, timer, questions])

  useEffect(() => {
    if (quizStatus !== 'PLAYING') return

    if (timer <= 0) {
      setQuizStatus('FINISHED')
      return
    }

    const countdown = setInterval(() => {
      setTimer((prev) => prev - 1)
    }, 1000)

    return () => clearInterval(countdown)
  }, [timer, quizStatus])

  const fetchQuestions = async () => {
    setLoading(true)
    try {
      const res = await fetch(API_URL)
      const data = await res.json()
      
     const formattedQuestions = data.results.map((q) => {
        const allChoices = shuffleArray([q.correct_answer, ...q.incorrect_answers])
        return {
          question: decodeHTML(q.question),
          correctAnswer: decodeHTML(q.correct_answer),
          choices: allChoices.map(choice => decodeHTML(choice))
        }
      })

      setQuestions(formattedQuestions)
      setQuizStatus('PLAYING')
      setTimer(60) 
      setCurrentIndex(0)
      setUserAnswers([])
    } catch (error) {
      console.error("Gagal mengambil data kuis:", error)
      alert("Gagal memuat soal, silakan coba lagi.")
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = (e) => {
    e.preventDefault()
    if (!usernameInput.trim()) return alert('Nama tidak boleh kosong!')
    setUser(usernameInput)
    localStorage.setItem('quiz_user', usernameInput)
    fetchQuestions()
  }

  const handleAnswerClick = (selectedAnswer) => {
    const currentQuestion = questions[currentIndex]
    const isCorrect = selectedAnswer === currentQuestion.correctAnswer
    
    const updatedAnswers = [...userAnswers, {
      question: currentQuestion.question,
      selected: selectedAnswer,
      correct: currentQuestion.correctAnswer,
      isCorrect: isCorrect
    }]
    
    setUserAnswers(updatedAnswers)

    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(currentIndex + 1)
    } else {
      setQuizStatus('FINISHED')
    }
  }

  const handleLogoutReset = () => {
    localStorage.clear()
    setUser('')
    setQuestions([])
    setCurrentIndex(0)
    setUserAnswers([])
    setQuizStatus('LOGIN')
    setUsernameInput('')
  }

  if (quizStatus === 'LOGIN') {
    return (
      <div className="card-container">
        <h2>Selamat Datang di Aplikasi Kuis</h2>
        <form onSubmit={handleLogin}>
          <input 
            type="text" 
            placeholder="Masukkan Nama Anda..." 
            value={usernameInput}
            onChange={(e) => setUsernameInput(e.target.value)}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Memuat Soal...' : 'Mulai Kuis'}
          </button>
        </form>
      </div>
    )
  }

  if (quizStatus === 'PLAYING' && questions.length > 0) {
    const currentQuestion = questions[currentIndex]
    return (
      <div className="card-container">
        <div className="quiz-header">
          <span>Peserta: <b>{user}</b></span>
          <span className="timer">Sisa Waktu: <b>{timer}s</b></span>
        </div>
        <div className="progress">
          Soal {currentIndex + 1} dari {questions.length}
        </div>
        <h3 className="question-text">{currentQuestion.question}</h3>
        <div className="choices-grid">
          {currentQuestion.choices.map((choice, idx) => (
            <button 
              key={idx} 
              className="btn-choice"
              onClick={() => handleAnswerClick(choice)}
            >
              {choice}
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (quizStatus === 'FINISHED') {
    const totalBenar = userAnswers.filter(ans => ans.isCorrect).length
    const totalSalah = userAnswers.length - totalBenar
    const totalDijawab = userAnswers.length

    return (
      <div className="card-container">
        <h2>Hasil Kuis</h2>
        <p>Terima kasih telah berpartisipasi, <b>{user}</b>!</p>
        <div className="result-box">
          <p>Jumlah Terjawab: <b>{totalDijawab} Soal</b></p>
          <p style={{ color: 'green' }}>Jawaban Benar: <b>{totalBenar}</b></p>
          <p style={{ color: 'red' }}>Jawaban Salah: <b>{totalSalah}</b></p>
        </div>
        <button onClick={handleLogoutReset} className="btn-restart">
          Keluar & Ulangi Kuis
        </button>
      </div>
    )
  }

  return null
}

export default App