import { generateRandomString } from '../utils/test-helpers';

/**
 * Sample transcription content for different subjects and complexity levels
 */
// Test data last updated: 2025-06-25T18:16:14.184Z
// Test data last updated: 2025-06-25T18:16:14.916Z
// Test data last updated: 2025-06-25T18:16:15.722Z
// Test data last updated: 2025-06-25T18:16:16.692Z
// Test data last updated: 2025-06-25T18:16:17.086Z
// Test data last updated: 2025-06-25T18:16:17.541Z
// Test data last updated: 2025-06-25T18:16:18.368Z
// Test data last updated: 2025-06-25T19:12:48.224Z
// Test data last updated: 2025-06-25T19:37:33.787Z
// Test data last updated: 2025-06-25T19:39:55.926Z
// Test data last updated: 2025-06-25T21:31:59.132Z
// Test data last updated: 2025-06-25T23:11:52.089Z
// Test data last updated: 2025-06-25T23:56:12.915Z
// Test data last updated: 2025-06-26T05:31:39.720Z
// Test data last updated: 2025-06-26T09:50:16.894Z
// Test data last updated: 2025-06-26T17:18:46.571Z
// Test data last updated: 2025-06-26T17:40:57.440Z
// Test data last updated: 2025-06-26T18:10:15.213Z
// Test data last updated: 2025-06-26T18:12:48.357Z
// Test data last updated: 2025-06-26T18:15:07.855Z
// Test data last updated: 2025-06-26T18:17:36.831Z
// Test data last updated: 2025-06-26T18:19:53.075Z
// Test data last updated: 2025-06-26T18:22:52.808Z
// Test data last updated: 2025-06-26T18:25:38.975Z
// Test data last updated: 2025-06-26T19:41:09.654Z
// Test data last updated: 2025-06-26T19:46:34.481Z
// Test data last updated: 2025-06-26T20:51:14.852Z
// Test data last updated: 2025-06-26T23:15:51.159Z
// Test data last updated: 2025-06-26T23:48:43.438Z
// Test data last updated: 2025-06-27T00:22:03.499Z
// Test data last updated: 2025-06-27T00:28:02.878Z
// Test data last updated: 2025-06-30T16:35:41.759Z
// Test data last updated: 2025-06-30T16:47:33.007Z
// Test data last updated: 2025-06-30T16:52:34.173Z
// Test data last updated: 2025-06-30T16:57:30.025Z
// Test data last updated: 2025-06-30T17:02:25.710Z
// Test data last updated: 2025-06-30T17:07:16.378Z
// Test data last updated: 2025-06-30T17:12:49.110Z
// Test data last updated: 2025-06-30T17:18:12.920Z
// Test data last updated: 2025-06-30T17:40:52.924Z
// Test data last updated: 2025-06-30T18:58:39.411Z
// Test data last updated: 2025-06-30T19:27:58.622Z
// Test data last updated: 2025-07-01T17:15:02.429Z
export const SAMPLE_TRANSCRIPTIONS = {
  javascript_basic: {
    title: 'Introduction to JavaScript',
    content: `JavaScript is a high-level, interpreted programming language that conforms to the ECMAScript specification. 
    
    JavaScript is a programming language that adds interactivity to your website. This happens in games, in the behavior of responses when buttons are pressed or with data entry on forms; with dynamic styling; with animation, etc.

    Key concepts in JavaScript include:
    
    1. Variables and Data Types
    Variables are containers for storing data values. In JavaScript, you can declare variables using var, let, or const.
    - var: Function-scoped or globally-scoped
    - let: Block-scoped
    - const: Block-scoped and cannot be reassigned
    
    2. Functions
    Functions are blocks of code designed to perform a particular task. A JavaScript function is executed when "something" invokes it (calls it).
    
    3. Objects and Arrays
    Objects are collections of key-value pairs, while arrays are ordered lists of values.
    
    4. Control Structures
    JavaScript supports conditional statements (if, else, switch) and loops (for, while, do-while).
    
    5. Event Handling
    JavaScript can respond to user interactions like clicks, key presses, and mouse movements.
    
    This forms the foundation for web development and modern application building.`,
    tags: ['programming', 'javascript', 'web-development', 'beginner']
  },
  
  react_intermediate: {
    title: 'React Components and State Management',
    content: `React is a JavaScript library for building user interfaces, particularly web applications. It was developed by Facebook and is now maintained by Facebook and the community.

    Core React Concepts:
    
    1. Components
    Components are the building blocks of React applications. They can be functional components or class components.
    
    Functional Components:
    const MyComponent = () => {
      return <div>Hello World</div>;
    };
    
    2. JSX (JavaScript XML)
    JSX allows you to write HTML-like syntax in JavaScript. It makes React components more readable and easier to write.
    
    3. Props
    Props are arguments passed into React components. They are passed to components via HTML attributes.
    
    4. State
    State is a built-in React object that is used to contain data or information about the component.
    
    5. Hooks
    Hooks are functions that let you use state and other React features in functional components.
    - useState: For managing component state
    - useEffect: For side effects
    - useContext: For consuming context
    - useMemo: For memoization
    - useCallback: For memoizing functions
    
    6. Component Lifecycle
    Components go through different phases: mounting, updating, and unmounting.
    
    7. Event Handling
    React events are SyntheticEvents that wrap native events to provide consistent behavior across browsers.
    
    Modern React development focuses on functional components with hooks for state management.`,
    tags: ['react', 'frontend', 'components', 'state-management', 'intermediate']
  },
  
  python_advanced: {
    title: 'Advanced Python Programming Concepts',
    content: `Python is a high-level, interpreted programming language known for its simplicity and readability. This content covers advanced Python concepts.

    Advanced Python Topics:
    
    1. Decorators
    Decorators are a powerful feature that allows you to modify the behavior of functions or classes.
    
    def my_decorator(func):
        def wrapper():
            print("Before function call")
            func()
            print("After function call")
        return wrapper
    
    2. Context Managers
    Context managers allow you to allocate and release resources precisely when you want to.
    
    with open('file.txt', 'r') as file:
        content = file.read()
    
    3. Generators
    Generators are functions that return an iterator object which we can iterate over one value at a time.
    
    def fibonacci():
        a, b = 0, 1
        while True:
            yield a
            a, b = b, a + b
    
    4. Metaclasses
    Metaclasses are classes whose instances are classes themselves.
    
    5. Async/Await
    Python supports asynchronous programming with async and await keywords.
    
    async def fetch_data():
        await some_async_operation()
    
    6. Type Hints
    Type hints help make code more readable and enable better IDE support.
    
    def greet(name: str) -> str:
        return f"Hello, {name}!"
    
    7. Design Patterns
    Common design patterns in Python include Singleton, Factory, Observer, and Strategy patterns.
    
    These concepts enable writing more efficient, maintainable, and scalable Python applications.`,
    tags: ['python', 'programming', 'advanced', 'design-patterns', 'async']
  }
};

/**
 * Sample quiz configurations for different types
 */
export const SAMPLE_QUIZ_CONFIGS = {
  quick_assessment: {
    title: 'Quick Knowledge Check',
    description: 'A quick 5-minute assessment to test basic understanding',
    timePerQuestion: 30,
    questionCount: 10,
    difficulty: 'easy',
    shuffleQuestions: true,
          showAnswersWhen: 'after_quiz'
  },
  
  comprehensive_exam: {
    title: 'Comprehensive Final Exam',
    description: 'A thorough examination covering all course material',
    timePerQuestion: 120,
    questionCount: 25,
    difficulty: 'hard',
    shuffleQuestions: true,
    showAnswersWhen: 'never'
  },
  
  practice_session: {
    title: 'Practice Session',
    description: 'Practice questions with immediate feedback',
    timePerQuestion: 60,
    questionCount: 15,
    difficulty: 'medium',
    shuffleQuestions: false,
    showAnswersWhen: 'immediately'
  }
};

/**
 * Sample room configurations for different scenarios
 */
export const SAMPLE_ROOM_CONFIGS = {
  classroom_session: {
    name: 'Computer Science 101 - Quiz Session',
    description: 'Weekly quiz session for CS101 students',
    maxParticipants: 30,
    timeMode: 'per_question',
    allowLateJoin: true,
    roomType: 'public'
  },
  
  competition: {
    name: 'Programming Competition Finals',
    description: 'Final round of the programming competition',
    maxParticipants: 100,
    timeMode: 'total_time',
    allowLateJoin: false,
    roomType: 'public'
  },
  
  private_assessment: {
    name: 'Job Interview Assessment',
    description: 'Technical assessment for software developer position',
    maxParticipants: 1,
    timeMode: 'per_question',
    allowLateJoin: false,
    roomType: 'private'
  }
};

/**
 * Sample questions for different types and difficulties
 */
export const SAMPLE_QUESTIONS = {
  multiple_choice_easy: {
    questionText: 'What does HTML stand for?',
    questionType: 'multiple_choice',
    difficulty: 'easy',
    options: [
      { text: 'HyperText Markup Language', isCorrect: true },
      { text: 'High Tech Modern Language', isCorrect: false },
      { text: 'Home Tool Markup Language', isCorrect: false },
      { text: 'Hyperlink and Text Markup Language', isCorrect: false }
    ],
    explanation: 'HTML stands for HyperText Markup Language, which is the standard markup language for creating web pages.'
  },
  
  multiple_choice_medium: {
    questionText: 'Which JavaScript method is used to add an element to the end of an array?',
    questionType: 'multiple_choice',
    difficulty: 'medium',
    options: [
      { text: 'push()', isCorrect: true },
      { text: 'pop()', isCorrect: false },
      { text: 'shift()', isCorrect: false },
      { text: 'unshift()', isCorrect: false }
    ],
    explanation: 'The push() method adds one or more elements to the end of an array and returns the new length of the array.'
  },
  
  multiple_choice_hard: {
    questionText: 'What is the time complexity of searching for an element in a balanced binary search tree?',
    questionType: 'multiple_choice',
    difficulty: 'hard',
    options: [
      { text: 'O(log n)', isCorrect: true },
      { text: 'O(n)', isCorrect: false },
      { text: 'O(n log n)', isCorrect: false },
      { text: 'O(1)', isCorrect: false }
    ],
    explanation: 'In a balanced binary search tree, the time complexity for search operations is O(log n) because the tree height is logarithmic.'
  },
  
  true_false: {
    questionText: 'JavaScript is a statically typed programming language.',
    questionType: 'true_false',
    difficulty: 'easy',
    options: [
      { text: 'True', isCorrect: false },
      { text: 'False', isCorrect: true }
    ],
    explanation: 'JavaScript is a dynamically typed language, not statically typed. Variable types are determined at runtime.'
  }
};

/**
 * User profiles for different test scenarios
 */
export const TEST_USER_PROFILES = {
  active_professor: {
    email: 'prof.active@test.com',
    password: 'Test123!',
    fullName: 'Dr. Active Professor',
    role: 'professor',
    isActive: true,
    hasCreatedContent: true
  },
  
  new_professor: {
    email: 'prof.new@test.com',
    password: 'Test123!',
    fullName: 'Prof. New Teacher',
    role: 'professor',
    isActive: true,
    hasCreatedContent: false
  },
  
  engaged_student: {
    email: 'student.engaged@test.com',
    password: 'Test123!',
    fullName: 'Alex Engaged Student',
    role: 'student',
    isActive: true,
    hasParticipated: true
  },
  
  new_student: {
    email: 'student.new@test.com',
    password: 'Test123!',
    fullName: 'Jordan New Student',
    role: 'student',
    isActive: true,
    hasParticipated: false
  }
};

/**
 * Generate dynamic test data with unique identifiers
 */
export function generateTestData() {
  const timestamp = Date.now();
  const randomId = generateRandomString(6);
  
  return {
    transcription: {
      title: `Test Transcription ${randomId}`,
      content: SAMPLE_TRANSCRIPTIONS.javascript_basic.content,
      tags: ['test', 'auto-generated', `session-${timestamp}`]
    },
    
    quiz: {
      ...SAMPLE_QUIZ_CONFIGS.practice_session,
      title: `Test Quiz ${randomId}`,
      description: `Auto-generated test quiz created at ${new Date().toISOString()}`
    },
    
    room: {
      ...SAMPLE_ROOM_CONFIGS.classroom_session,
      name: `Test Room ${randomId}`,
      description: `Auto-generated test room for session ${timestamp}`,
      maxParticipants: Math.floor(Math.random() * 50) + 10 // Random between 10-60
    },
    
    user: {
      email: `test.user.${randomId}@example.com`,
      password: 'Test123!',
      fullName: `Test User ${randomId}`,
      role: Math.random() > 0.5 ? 'student' : 'professor'
    }
  };
}

/**
 * Cleanup identifiers for test data
 */
export const TEST_DATA_CLEANUP = {
  transcriptionPrefixes: ['Test Transcription', 'Auto Test'],
  quizPrefixes: ['Test Quiz', 'Auto Quiz'],
  roomPrefixes: ['Test Room', 'Auto Room'],
  userEmailPrefixes: ['test.user.', 'auto.test.'],
  sessionTags: ['test', 'auto-generated']
}; 