import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { registerStoreResetter } from './utils/reset'

// Types for Quiz Store
export interface Question {
  id: string
  text: string
  type: 'multiple_choice' | 'true_false' | 'short_answer'
  options?: string[]
  correctAnswer: string | number
  points: number
  timeLimit?: number
  explanation?: string
  category?: string
  difficulty?: 'easy' | 'medium' | 'hard'
  imageUrl?: string
}

export interface Answer {
  questionId: string
  selectedAnswer: string | number | null
  isCorrect: boolean
  points: number
  timeSpent: number
  submittedAt: string
  attempts?: number
}

export interface Quiz {
  id: string
  title: string
  description?: string
  questions: Question[]
  totalQuestions: number
  totalPoints: number
  timeLimit?: number
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled'
  createdAt: string
  settings: {
    shuffleQuestions: boolean
    shuffleOptions: boolean
    allowReview: boolean
    showCorrectAnswers: boolean
    timePerQuestion?: number
    passingScore?: number
  }
}

export interface QuizSession {
  id: string
  quizId: string
  participantId: string
  startedAt: string
  completedAt?: string
  currentQuestionIndex: number
  answers: Answer[]
  score: number
  totalTimeSpent: number
  status: 'in_progress' | 'completed' | 'paused' | 'abandoned'
  isPaused: boolean
  pausedAt?: string
  resumedAt?: string
}

export interface QuizState {
  // Current quiz data
  currentQuiz: Quiz | null
  currentSession: QuizSession | null
  currentQuestion: Question | null
  currentQuestionIndex: number
  
  // Quiz progress
  answers: Answer[]
  score: number
  totalTimeSpent: number
  questionStartTime: number
  
  // Timer state
  timeRemaining: number
  isTimerActive: boolean
  timerInterval: NodeJS.Timeout | null
  
  // UI state
  isLoading: boolean
  showExplanations: boolean
  showResults: boolean
  isSubmitting: boolean
  
  // Quiz management
  quizHistory: QuizSession[]
  
  // Actions
  setCurrentQuiz: (quiz: Quiz | null) => void
  startQuiz: (quizId: string, participantId: string) => void
  pauseQuiz: () => void
  resumeQuiz: () => void
  completeQuiz: () => void
  
  // Question navigation
  goToQuestion: (index: number) => void
  nextQuestion: () => void
  previousQuestion: () => void
  
  // Answer management
  submitAnswer: (questionId: string, answer: string | number) => void
  updateAnswer: (questionId: string, answer: string | number) => void
  clearAnswer: (questionId: string) => void
  
  // Timer management
  startTimer: (duration: number) => void
  stopTimer: () => void
  resetTimer: () => void
  updateTimeRemaining: (time: number) => void
  
  // UI actions
  setLoading: (loading: boolean) => void
  toggleExplanations: () => void
  toggleResults: () => void
  setSubmitting: (submitting: boolean) => void
  
  // Utility actions
  reset: () => void
  clearHistory: () => void
}

// Initial state
const initialState = {
  currentQuiz: null,
  currentSession: null,
  currentQuestion: null,
  currentQuestionIndex: 0,
  answers: [],
  score: 0,
  totalTimeSpent: 0,
  questionStartTime: 0,
  timeRemaining: 0,
  isTimerActive: false,
  timerInterval: null,
  isLoading: false,
  showExplanations: false,
  showResults: false,
  isSubmitting: false,
  quizHistory: [],
}

// Create the Quiz Store
export const useQuizStore = create<QuizState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Quiz management
      setCurrentQuiz: (quiz) => {
        const state = get()
        if (state.timerInterval) {
          clearInterval(state.timerInterval)
        }
        
        set({ 
          currentQuiz: quiz,
          currentQuestion: quiz?.questions[0] || null,
          currentQuestionIndex: 0,
          timeRemaining: quiz?.timeLimit || 0,
          isTimerActive: false,
        })
      },

      startQuiz: (quizId, participantId) => {
        const quiz = get().currentQuiz
        if (!quiz) return

        const session: QuizSession = {
          id: `session-${Date.now()}`,
          quizId,
          participantId,
          startedAt: new Date().toISOString(),
          currentQuestionIndex: 0,
          answers: [],
          score: 0,
          totalTimeSpent: 0,
          status: 'in_progress',
          isPaused: false,
        }

        set({
          currentSession: session,
          currentQuestionIndex: 0,
          currentQuestion: quiz.questions[0],
          questionStartTime: Date.now(),
          answers: [],
          score: 0,
          totalTimeSpent: 0,
        })

        // Start timer if quiz has time limit
        if (quiz.timeLimit) {
          get().startTimer(quiz.timeLimit)
        }
      },

      pauseQuiz: () => {
        const state = get()
        if (state.timerInterval) {
          clearInterval(state.timerInterval)
        }

        const session = state.currentSession
        if (session) {
          const updatedSession = {
            ...session,
            isPaused: true,
            pausedAt: new Date().toISOString(),
            status: 'paused' as const,
          }
          set({
            currentSession: updatedSession,
            isTimerActive: false,
            timerInterval: null,
          })
        }
      },

      resumeQuiz: () => {
        const state = get()
        const session = state.currentSession
        
        if (session) {
          const updatedSession = {
            ...session,
            isPaused: false,
            resumedAt: new Date().toISOString(),
            status: 'in_progress' as const,
          }
          
          set({
            currentSession: updatedSession,
            questionStartTime: Date.now(),
          })

          // Resume timer if there's time remaining
          if (state.timeRemaining > 0) {
            get().startTimer(state.timeRemaining)
          }
        }
      },

      completeQuiz: () => {
        const state = get()
        if (state.timerInterval) {
          clearInterval(state.timerInterval)
        }

        const session = state.currentSession
        if (session) {
          const completedSession = {
            ...session,
            completedAt: new Date().toISOString(),
            status: 'completed' as const,
            score: state.score,
            totalTimeSpent: state.totalTimeSpent,
          }

          // Add to history
          const updatedHistory = [completedSession, ...state.quizHistory].slice(0, 20)

          set({
            currentSession: completedSession,
            quizHistory: updatedHistory,
            isTimerActive: false,
            timerInterval: null,
            showResults: true,
          })
        }
      },

      // Question navigation
      goToQuestion: (index) => {
        const quiz = get().currentQuiz
        if (!quiz || index < 0 || index >= quiz.questions.length) return

        // Record time spent on current question
        const timeSpent = Date.now() - get().questionStartTime

        set({
          currentQuestionIndex: index,
          currentQuestion: quiz.questions[index],
          questionStartTime: Date.now(),
          totalTimeSpent: get().totalTimeSpent + timeSpent,
        })
      },

      nextQuestion: () => {
        const state = get()
        const nextIndex = state.currentQuestionIndex + 1
        
        if (state.currentQuiz && nextIndex < state.currentQuiz.questions.length) {
          state.goToQuestion(nextIndex)
        } else {
          // Quiz completed
          state.completeQuiz()
        }
      },

      previousQuestion: () => {
        const state = get()
        const prevIndex = state.currentQuestionIndex - 1
        
        if (prevIndex >= 0) {
          state.goToQuestion(prevIndex)
        }
      },

      // Answer management
      submitAnswer: (questionId, answer) => {
        const state = get()
        const question = state.currentQuiz?.questions.find(q => q.id === questionId)
        if (!question) return

        const timeSpent = Date.now() - state.questionStartTime
        const isCorrect = answer === question.correctAnswer
        const points = isCorrect ? question.points : 0

        const answerRecord: Answer = {
          questionId,
          selectedAnswer: answer,
          isCorrect,
          points,
          timeSpent,
          submittedAt: new Date().toISOString(),
          attempts: 1,
        }

        // Update or add answer
        const existingAnswerIndex = state.answers.findIndex(a => a.questionId === questionId)
        let updatedAnswers: Answer[]

        if (existingAnswerIndex >= 0) {
          updatedAnswers = [...state.answers]
          updatedAnswers[existingAnswerIndex] = answerRecord
        } else {
          updatedAnswers = [...state.answers, answerRecord]
        }

        // Calculate new score
        const newScore = updatedAnswers.reduce((total, ans) => total + ans.points, 0)

        set({
          answers: updatedAnswers,
          score: newScore,
        })

        // Auto-advance to next question
        setTimeout(() => {
          get().nextQuestion()
        }, 1000)
      },

      updateAnswer: (questionId, answer) => {
        // This is for updating answers without submitting (draft mode)
        const state = get()
        const existingAnswerIndex = state.answers.findIndex(a => a.questionId === questionId)
        
        if (existingAnswerIndex >= 0) {
          const updatedAnswers = [...state.answers]
          updatedAnswers[existingAnswerIndex] = {
            ...updatedAnswers[existingAnswerIndex],
            selectedAnswer: answer,
          }
          set({ answers: updatedAnswers })
        }
      },

      clearAnswer: (questionId) => {
        set({
          answers: get().answers.filter(a => a.questionId !== questionId)
        })
      },

      // Timer management
      startTimer: (duration) => {
        const state = get()
        if (state.timerInterval) {
          clearInterval(state.timerInterval)
        }

        set({ 
          timeRemaining: duration,
          isTimerActive: true,
        })

        const interval = setInterval(() => {
          const currentTime = get().timeRemaining
          if (currentTime <= 0) {
            get().completeQuiz()
          } else {
            set({ timeRemaining: currentTime - 1 })
          }
        }, 1000)

        set({ timerInterval: interval })
      },

      stopTimer: () => {
        const state = get()
        if (state.timerInterval) {
          clearInterval(state.timerInterval)
        }
        set({ 
          isTimerActive: false,
          timerInterval: null,
        })
      },

      resetTimer: () => {
        const state = get()
        if (state.timerInterval) {
          clearInterval(state.timerInterval)
        }
        set({
          timeRemaining: state.currentQuiz?.timeLimit || 0,
          isTimerActive: false,
          timerInterval: null,
        })
      },

      updateTimeRemaining: (time) => {
        set({ timeRemaining: time })
      },

      // UI actions
      setLoading: (loading) => {
        set({ isLoading: loading })
      },

      toggleExplanations: () => {
        set({ showExplanations: !get().showExplanations })
      },

      toggleResults: () => {
        set({ showResults: !get().showResults })
      },

      setSubmitting: (submitting) => {
        set({ isSubmitting: submitting })
      },

      // Utility actions
      reset: () => {
        const state = get()
        if (state.timerInterval) {
          clearInterval(state.timerInterval)
        }
        set(initialState)
      },

      clearHistory: () => {
        set({ quizHistory: [] })
      },
    }),
    {
      name: 'arquiz-quiz-store',
      partialize: (state) => ({
        quizHistory: state.quizHistory,
        showExplanations: state.showExplanations,
      }),
    }
  )
)

// Register reset function
registerStoreResetter(() => {
  const state = useQuizStore.getState()
  if (state.timerInterval) {
    clearInterval(state.timerInterval)
  }
  state.reset()
})

// Computed selectors
export const quizSelectors = {
  // Get quiz progress percentage
  getProgress: (state: QuizState) => {
    if (!state.currentQuiz) return 0
    return (state.currentQuestionIndex / state.currentQuiz.totalQuestions) * 100
  },

  // Get answered questions count
  getAnsweredCount: (state: QuizState) => state.answers.length,

  // Get current question answer
  getCurrentAnswer: (state: QuizState) => {
    if (!state.currentQuestion) return null
    return state.answers.find(a => a.questionId === state.currentQuestion!.id)
  },

  // Check if quiz is in progress
  isQuizInProgress: (state: QuizState) => 
    state.currentSession?.status === 'in_progress' && !state.currentSession.isPaused,

  // Get quiz completion status
  isQuizCompleted: (state: QuizState) => 
    state.currentSession?.status === 'completed',

  // Get time remaining formatted
  getFormattedTimeRemaining: (state: QuizState) => {
    const minutes = Math.floor(state.timeRemaining / 60)
    const seconds = state.timeRemaining % 60
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  },

  // Get quiz statistics
  getQuizStats: (state: QuizState) => ({
    totalQuestions: state.currentQuiz?.totalQuestions || 0,
    answeredQuestions: state.answers.length,
    correctAnswers: state.answers.filter(a => a.isCorrect).length,
    score: state.score,
    totalPoints: state.currentQuiz?.totalPoints || 0,
    timeSpent: state.totalTimeSpent,
    progress: quizSelectors.getProgress(state),
  }),
} 