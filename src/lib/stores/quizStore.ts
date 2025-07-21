import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import type { 
  Quiz, 
  Question, 
  QuestionOption,
  Answer,
  QuizResult,
  QuizStatus,
  QuizDifficulty,
  QuestionType,
  CreateQuizDto,
  UpdateQuizDto,
  QuizError,
  QuizAnalytics
} from '../../../../shared/types'

// Re-export shared types for convenience
export type { 
  Quiz, 
  Question, 
  QuestionOption,
  Answer,
  QuizResult,
  QuizStatus,
  QuizDifficulty,
  QuestionType,
  CreateQuizDto,
  UpdateQuizDto,
  QuizError,
  QuizAnalytics
} from '../../../../shared/types'

// Quiz session state interface using shared types
export interface QuizSession {
  readonly quizId: string
  readonly participantId: string
  readonly startTime: Date
  readonly currentQuestionIndex: number
  readonly answers: Map<string, Answer>
  readonly timeRemaining?: number
  readonly isCompleted: boolean
  readonly score?: number
}

// Store state interface using shared types
export interface QuizState {
  // Current quiz state
  currentQuiz: Quiz | null
  currentQuestion: Question | null
  currentQuestionIndex: number
  questions: Question[]
  
  // Session state
  session: QuizSession | null
  answers: Map<string, Answer>
  timeRemaining: number | null
  
  // UI state
  isLoading: boolean
  error: QuizError | null
  isSubmitting: boolean
  
  // Quiz list state
  quizList: Quiz[]
  quizListLoading: boolean
  quizListError: string | null
  
  // Results state
  results: QuizResult[]
  currentResult: QuizResult | null
  analytics: QuizAnalytics | null
  
  // Actions
  setCurrentQuiz: (quiz: Quiz | null) => void
  setQuestions: (questions: Question[]) => void
  setCurrentQuestion: (question: Question | null, index: number) => void
  startQuizSession: (quiz: Quiz, participantId: string) => void
  submitAnswer: (questionId: string, answer: Answer) => void
  completeQuiz: () => Promise<QuizResult | null>
  
  // Navigation
  nextQuestion: () => void
  previousQuestion: () => void
  goToQuestion: (index: number) => void
  
  // Timer
  setTimeRemaining: (time: number | null) => void
  decrementTime: () => void
  
  // Error handling
  setError: (error: QuizError | null) => void
  clearError: () => void
  
  // Loading states
  setLoading: (loading: boolean) => void
  setSubmitting: (submitting: boolean) => void
  
  // Quiz list actions
  setQuizList: (quizzes: Quiz[]) => void
  addQuiz: (quiz: Quiz) => void
  updateQuiz: (quizId: string, updates: Partial<Quiz>) => void
  removeQuiz: (quizId: string) => void
  
  // Results actions
  setResults: (results: QuizResult[]) => void
  setCurrentResult: (result: QuizResult | null) => void
  setAnalytics: (analytics: QuizAnalytics | null) => void
  
  // Async actions
  loadQuiz: (quizId: string) => Promise<void>
  createQuiz: (quizData: CreateQuizDto) => Promise<Quiz>
  updateQuizData: (quizId: string, updates: UpdateQuizDto) => Promise<void>
  loadResults: (quizId?: string) => Promise<void>
  
  // Reset
  reset: () => void
  resetSession: () => void
}

// Initial state
const initialState = {
  currentQuiz: null,
  currentQuestion: null,
  currentQuestionIndex: 0,
  questions: [],
  session: null,
  answers: new Map(),
  timeRemaining: null,
  isLoading: false,
  error: null,
  isSubmitting: false,
  quizList: [],
  quizListLoading: false,
  quizListError: null,
  results: [],
  currentResult: null,
  analytics: null,
}

// Create store with shared types
export const useQuizStore = create<QuizState>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      ...initialState,

      // Synchronous actions
      setCurrentQuiz: (quiz) => set({ 
        currentQuiz: quiz,
        questions: quiz?.questions || [],
        currentQuestionIndex: 0,
        currentQuestion: quiz?.questions?.[0] || null
      }),
      
      setQuestions: (questions) => set({ 
        questions,
        currentQuestion: questions[0] || null,
        currentQuestionIndex: 0
      }),
      
      setCurrentQuestion: (question, index) => set({ 
        currentQuestion: question,
        currentQuestionIndex: index
      }),
      
      startQuizSession: (quiz, participantId) => {
        const session: QuizSession = {
          quizId: quiz.id,
          participantId,
          startTime: new Date(),
          currentQuestionIndex: 0,
          answers: new Map(),
          isCompleted: false,
        }
        
        set({ 
          currentQuiz: quiz,
          session,
          questions: quiz.questions || [],
          currentQuestion: quiz.questions?.[0] || null,
          currentQuestionIndex: 0,
          answers: new Map(),
                     timeRemaining: quiz.timeLimit ? quiz.timeLimit * 60 : null
        })
      },
      
      submitAnswer: (questionId, answer) => {
        const { answers, session } = get()
        const newAnswers = new Map(answers)
        newAnswers.set(questionId, answer)
        
        const updatedSession = session ? {
          ...session,
          answers: newAnswers
        } : null
        
        set({ answers: newAnswers, session: updatedSession })
      },
      
      nextQuestion: () => {
        const { currentQuestionIndex, questions } = get()
        if (currentQuestionIndex < questions.length - 1) {
          const newIndex = currentQuestionIndex + 1
          set({ 
            currentQuestionIndex: newIndex,
            currentQuestion: questions[newIndex]
          })
        }
      },
      
      previousQuestion: () => {
        const { currentQuestionIndex, questions } = get()
        if (currentQuestionIndex > 0) {
          const newIndex = currentQuestionIndex - 1
          set({ 
            currentQuestionIndex: newIndex,
            currentQuestion: questions[newIndex]
          })
        }
      },
      
      goToQuestion: (index) => {
        const { questions } = get()
        if (index >= 0 && index < questions.length) {
          set({ 
            currentQuestionIndex: index,
            currentQuestion: questions[index]
          })
        }
      },
      
      setTimeRemaining: (time) => set({ timeRemaining: time }),
      
      decrementTime: () => {
        const { timeRemaining } = get()
        if (timeRemaining !== null && timeRemaining > 0) {
          set({ timeRemaining: timeRemaining - 1 })
        }
      },
      
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),
      
      setLoading: (loading) => set({ isLoading: loading }),
      setSubmitting: (submitting) => set({ isSubmitting: submitting }),
      
      setQuizList: (quizList) => set({ quizList }),
      
      addQuiz: (quiz) => set((state) => ({
        quizList: [...state.quizList, quiz]
      })),
      
      updateQuiz: (quizId, updates) => set((state) => ({
        quizList: state.quizList.map(quiz => 
          quiz.id === quizId ? { ...quiz, ...updates } : quiz
        ),
        currentQuiz: state.currentQuiz?.id === quizId 
          ? { ...state.currentQuiz, ...updates }
          : state.currentQuiz
      })),
      
      removeQuiz: (quizId) => set((state) => ({
        quizList: state.quizList.filter(quiz => quiz.id !== quizId),
        currentQuiz: state.currentQuiz?.id === quizId ? null : state.currentQuiz
      })),
      
      setResults: (results) => set({ results }),
      setCurrentResult: (result) => set({ currentResult: result }),
      setAnalytics: (analytics) => set({ analytics }),

      // Async actions
      loadQuiz: async (quizId: string) => {
        set({ isLoading: true, error: null })
        
        try {
          const response = await fetch(`/api/quizzes/${quizId}`)
          
          if (!response.ok) {
            throw new Error(`Failed to load quiz: ${response.statusText}`)
          }
          
          const quiz: Quiz = await response.json()
          
          set({ 
            currentQuiz: quiz,
            questions: quiz.questions || [],
            currentQuestion: quiz.questions?.[0] || null,
            currentQuestionIndex: 0,
            isLoading: false 
          })
        } catch (error) {
          set({ 
            error: {
              code: 'LOAD_QUIZ_FAILED',
              message: error instanceof Error ? error.message : 'Failed to load quiz'
            },
            isLoading: false 
          })
        }
      },

      createQuiz: async (quizData: CreateQuizDto): Promise<Quiz> => {
        set({ isLoading: true, error: null })
        
        try {
          const response = await fetch('/api/quizzes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(quizData),
          })
          
          if (!response.ok) {
            throw new Error(`Failed to create quiz: ${response.statusText}`)
          }
          
          const quiz: Quiz = await response.json()
          
          set((state) => ({
            quizList: [...state.quizList, quiz],
            isLoading: false
          }))
          
          return quiz
        } catch (error) {
          const quizError: QuizError = {
            code: 'CREATE_QUIZ_FAILED',
            message: error instanceof Error ? error.message : 'Failed to create quiz'
          }
          
          set({ error: quizError, isLoading: false })
          throw quizError
        }
      },

      updateQuizData: async (quizId: string, updates: UpdateQuizDto) => {
        set({ isLoading: true, error: null })
        
        try {
          const response = await fetch(`/api/quizzes/${quizId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
          })
          
          if (!response.ok) {
            throw new Error(`Failed to update quiz: ${response.statusText}`)
          }
          
          const updatedQuiz: Quiz = await response.json()
          
          get().updateQuiz(quizId, updatedQuiz)
          set({ isLoading: false })
        } catch (error) {
          set({ 
            error: {
              code: 'UPDATE_QUIZ_FAILED',
              message: error instanceof Error ? error.message : 'Failed to update quiz'
            },
            isLoading: false 
          })
        }
      },

      loadResults: async (quizId?: string) => {
        set({ isLoading: true, error: null })
        
        try {
          const url = quizId ? `/api/quizzes/${quizId}/results` : '/api/results'
          const response = await fetch(url)
          
          if (!response.ok) {
            throw new Error(`Failed to load results: ${response.statusText}`)
          }
          
          const results: QuizResult[] = await response.json()
          
          set({ results, isLoading: false })
        } catch (error) {
          set({ 
            error: {
              code: 'LOAD_RESULTS_FAILED',
              message: error instanceof Error ? error.message : 'Failed to load results'
            },
            isLoading: false 
          })
        }
      },

      completeQuiz: async (): Promise<QuizResult | null> => {
        const { session, answers, currentQuiz } = get()
        
        if (!session || !currentQuiz) {
          return null
        }

        set({ isSubmitting: true, error: null })
        
        try {
          const response = await fetch(`/api/quizzes/${session.quizId}/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              participantId: session.participantId,
              answers: Array.from(answers.entries()),
              completedAt: new Date(),
            }),
          })
          
          if (!response.ok) {
            throw new Error(`Failed to submit quiz: ${response.statusText}`)
          }
          
          const result: QuizResult = await response.json()
          
          const completedSession: QuizSession = {
            ...session,
            isCompleted: true,
            score: result.score,
          }
          
          set({ 
            session: completedSession,
            currentResult: result,
            isSubmitting: false 
          })
          
          return result
        } catch (error) {
          set({ 
            error: {
              code: 'SUBMIT_QUIZ_FAILED',
              message: error instanceof Error ? error.message : 'Failed to submit quiz'
            },
            isSubmitting: false 
          })
          return null
        }
      },

      reset: () => set(initialState),
      
      resetSession: () => set({
        session: null,
        answers: new Map(),
        timeRemaining: null,
        currentResult: null,
      }),
    })),
    { name: 'quiz-store' }
  )
)

// Selectors for computed values
export const quizSelectors = {
  getCurrentQuiz: (state: QuizState): Quiz | null => state.currentQuiz,
  getCurrentQuestion: (state: QuizState): Question | null => state.currentQuestion,
  getQuestions: (state: QuizState): Question[] => state.questions,
  getAnswers: (state: QuizState): Map<string, Answer> => state.answers,
  getSession: (state: QuizState): QuizSession | null => state.session,
  getTimeRemaining: (state: QuizState): number | null => state.timeRemaining,
  getProgress: (state: QuizState): number => {
    const { currentQuestionIndex, questions } = state
    return questions.length > 0 ? (currentQuestionIndex + 1) / questions.length : 0
  },
  getAnsweredQuestions: (state: QuizState): number => state.answers.size,
  isQuizCompleted: (state: QuizState): boolean => state.session?.isCompleted || false,
  hasError: (state: QuizState): boolean => state.error !== null,
  canGoNext: (state: QuizState): boolean => 
    state.currentQuestionIndex < state.questions.length - 1,
  canGoPrevious: (state: QuizState): boolean => state.currentQuestionIndex > 0,
} 