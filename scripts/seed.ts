import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "../app/db/schema";
import {
  UserRole,
  CourseStatus,
  LessonProgressStatus,
  QuestionType,
} from "../app/db/schema";

const sqlite = new Database("data.db");
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

const db = drizzle(sqlite, { schema });

// ─── Helpers ───

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// ─── Seed Data ───

async function seed() {
  console.log("Seeding database...");

  // Drop and recreate tables for a clean seed
  sqlite.exec(`
    DROP TABLE IF EXISTS video_watch_events;
    DROP TABLE IF EXISTS quiz_answers;
    DROP TABLE IF EXISTS quiz_attempts;
    DROP TABLE IF EXISTS quiz_options;
    DROP TABLE IF EXISTS quiz_questions;
    DROP TABLE IF EXISTS quizzes;
    DROP TABLE IF EXISTS lesson_progress;
    DROP TABLE IF EXISTS enrollments;
    DROP TABLE IF EXISTS lessons;
    DROP TABLE IF EXISTS modules;
    DROP TABLE IF EXISTS courses;
    DROP TABLE IF EXISTS categories;
    DROP TABLE IF EXISTS users;
  `);

  sqlite.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL,
      avatar_url TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE
    );

    CREATE TABLE courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL,
      instructor_id INTEGER NOT NULL REFERENCES users(id),
      category_id INTEGER NOT NULL REFERENCES categories(id),
      status TEXT NOT NULL,
      cover_image_url TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE modules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL REFERENCES courses(id),
      title TEXT NOT NULL,
      position INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE lessons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      module_id INTEGER NOT NULL REFERENCES modules(id),
      title TEXT NOT NULL,
      content_html TEXT,
      video_url TEXT,
      position INTEGER NOT NULL,
      duration_minutes INTEGER,
      created_at TEXT NOT NULL
    );

    CREATE TABLE enrollments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      course_id INTEGER NOT NULL REFERENCES courses(id),
      enrolled_at TEXT NOT NULL,
      completed_at TEXT
    );

    CREATE TABLE lesson_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      lesson_id INTEGER NOT NULL REFERENCES lessons(id),
      status TEXT NOT NULL,
      completed_at TEXT
    );

    CREATE TABLE quizzes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lesson_id INTEGER NOT NULL REFERENCES lessons(id),
      title TEXT NOT NULL,
      passing_score REAL NOT NULL
    );

    CREATE TABLE quiz_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quiz_id INTEGER NOT NULL REFERENCES quizzes(id),
      question_text TEXT NOT NULL,
      question_type TEXT NOT NULL,
      position INTEGER NOT NULL
    );

    CREATE TABLE quiz_options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_id INTEGER NOT NULL REFERENCES quiz_questions(id),
      option_text TEXT NOT NULL,
      is_correct INTEGER NOT NULL
    );

    CREATE TABLE quiz_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      quiz_id INTEGER NOT NULL REFERENCES quizzes(id),
      score REAL NOT NULL,
      passed INTEGER NOT NULL,
      attempted_at TEXT NOT NULL
    );

    CREATE TABLE quiz_answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      attempt_id INTEGER NOT NULL REFERENCES quiz_attempts(id),
      question_id INTEGER NOT NULL REFERENCES quiz_questions(id),
      selected_option_id INTEGER NOT NULL REFERENCES quiz_options(id)
    );

    CREATE TABLE video_watch_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      lesson_id INTEGER NOT NULL REFERENCES lessons(id),
      event_type TEXT NOT NULL,
      position_seconds REAL NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  console.log("Tables created.");

  // ─── Users ───
  // 1 admin, 2 instructors, 5 students

  const [admin] = db
    .insert(schema.users)
    .values({
      name: "Alex Rivera",
      email: "alex.rivera@ralph.dev",
      role: UserRole.Admin,
      avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=alex",
      createdAt: daysAgo(120),
    })
    .returning()
    .all();

  const [instructor1] = db
    .insert(schema.users)
    .values({
      name: "Sarah Chen",
      email: "sarah.chen@ralph.dev",
      role: UserRole.Instructor,
      avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=sarah",
      createdAt: daysAgo(100),
    })
    .returning()
    .all();

  const [instructor2] = db
    .insert(schema.users)
    .values({
      name: "Marcus Johnson",
      email: "marcus.johnson@ralph.dev",
      role: UserRole.Instructor,
      avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=marcus",
      createdAt: daysAgo(95),
    })
    .returning()
    .all();

  const students = db
    .insert(schema.users)
    .values([
      {
        name: "Emma Wilson",
        email: "emma.wilson@student.dev",
        role: UserRole.Student,
        avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=emma",
        createdAt: daysAgo(60),
      },
      {
        name: "James Park",
        email: "james.park@student.dev",
        role: UserRole.Student,
        avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=james",
        createdAt: daysAgo(55),
      },
      {
        name: "Olivia Martinez",
        email: "olivia.martinez@student.dev",
        role: UserRole.Student,
        avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=olivia",
        createdAt: daysAgo(45),
      },
      {
        name: "Liam Thompson",
        email: "liam.thompson@student.dev",
        role: UserRole.Student,
        avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=liam",
        createdAt: daysAgo(30),
      },
      {
        name: "Sophia Davis",
        email: "sophia.davis@student.dev",
        role: UserRole.Student,
        avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=sophia",
        createdAt: daysAgo(20),
      },
    ])
    .returning()
    .all();

  console.log(
    `Created ${1 + 2 + students.length} users (1 admin, 2 instructors, ${students.length} students).`
  );

  // ─── Categories ───

  const categoriesData = db
    .insert(schema.categories)
    .values([
      { name: "Programming", slug: "programming" },
      { name: "Design", slug: "design" },
      { name: "Data Science", slug: "data-science" },
      { name: "DevOps", slug: "devops" },
      { name: "Marketing", slug: "marketing" },
    ])
    .returning()
    .all();

  const catBySlug = Object.fromEntries(
    categoriesData.map((c) => [c.slug, c])
  );

  console.log(`Created ${categoriesData.length} categories.`);

  // ─── Course 1: Introduction to TypeScript (Sarah Chen) ───

  const [course1] = db
    .insert(schema.courses)
    .values({
      title: "Introduction to TypeScript",
      slug: "introduction-to-typescript",
      description:
        "Master TypeScript from the ground up. Learn type annotations, interfaces, generics, and advanced patterns that will make your JavaScript code safer and more maintainable. Includes hands-on projects and real-world examples.",
      instructorId: instructor1.id,
      categoryId: catBySlug["programming"].id,
      status: CourseStatus.Published,
      coverImageUrl: "https://picsum.photos/seed/typescript/800/400",
      createdAt: daysAgo(90),
      updatedAt: daysAgo(10),
    })
    .returning()
    .all();

  // Course 1 modules and lessons
  const c1Modules = [
    {
      title: "Getting Started with TypeScript",
      lessons: [
        {
          title: "What is TypeScript?",
          duration: 8,
          videoUrl: "https://www.youtube.com/watch?v=zQnBQ4tB3ZA",
          content: "<h2>What is TypeScript?</h2><p>TypeScript is a typed superset of JavaScript that compiles to plain JavaScript. It adds optional static typing and class-based object-oriented programming to the language.</p><h3>Why TypeScript?</h3><ul><li>Catch errors at compile time instead of runtime</li><li>Better IDE support with autocompletion</li><li>Easier to refactor large codebases</li><li>Self-documenting code through types</li></ul>",
        },
        {
          title: "Installing and Configuring TypeScript",
          duration: 12,
          videoUrl: "https://www.youtube.com/watch?v=zQnBQ4tB3ZA",
          content: "<h2>Setting Up TypeScript</h2><p>Let's get TypeScript installed and configured in your development environment.</p><h3>Installation</h3><pre><code>npm install -g typescript\ntsc --version</code></pre><h3>tsconfig.json</h3><p>The <code>tsconfig.json</code> file configures the TypeScript compiler options for your project.</p>",
        },
        {
          title: "Your First TypeScript Program",
          duration: 15,
          videoUrl: "https://www.youtube.com/watch?v=zQnBQ4tB3ZA",
          content: "<h2>Hello, TypeScript!</h2><p>Let's write our first TypeScript program and see the compilation process in action.</p><pre><code>function greet(name: string): string {\n  return `Hello, ${name}!`;\n}\n\nconsole.log(greet('World'));</code></pre>",
        },
      ],
    },
    {
      title: "Type System Fundamentals",
      lessons: [
        {
          title: "Primitive Types",
          duration: 10,
          videoUrl: "https://www.youtube.com/watch?v=zQnBQ4tB3ZA",
          content: "<h2>Primitive Types</h2><p>TypeScript supports the same primitive types as JavaScript, plus a few extras.</p><ul><li><code>string</code> — text values</li><li><code>number</code> — numeric values (integer and float)</li><li><code>boolean</code> — true/false</li><li><code>null</code> and <code>undefined</code></li><li><code>symbol</code> and <code>bigint</code></li></ul>",
        },
        {
          title: "Arrays and Tuples",
          duration: 12,
          videoUrl: "https://www.youtube.com/watch?v=zQnBQ4tB3ZA",
          content: "<h2>Arrays and Tuples</h2><p>Learn how to type arrays and fixed-length tuples in TypeScript.</p><pre><code>const numbers: number[] = [1, 2, 3];\nconst pair: [string, number] = ['age', 25];</code></pre>",
        },
        {
          title: "Type Aliases and Interfaces",
          duration: 18,
          videoUrl: "https://www.youtube.com/watch?v=zQnBQ4tB3ZA",
          content: "<h2>Type Aliases vs Interfaces</h2><p>Both type aliases and interfaces let you define custom types, but they have subtle differences.</p><h3>Type Alias</h3><pre><code>type User = {\n  name: string;\n  age: number;\n};</code></pre><h3>Interface</h3><pre><code>interface User {\n  name: string;\n  age: number;\n}</code></pre>",
        },
        {
          title: "Union and Intersection Types",
          duration: 14,
          videoUrl: "https://www.youtube.com/watch?v=zQnBQ4tB3ZA",
          content: "<h2>Union and Intersection Types</h2><p>Combine types in powerful ways using unions (<code>|</code>) and intersections (<code>&</code>).</p><pre><code>type StringOrNumber = string | number;\ntype Named = { name: string };\ntype Aged = { age: number };\ntype Person = Named & Aged;</code></pre>",
        },
      ],
    },
    {
      title: "Functions and Generics",
      lessons: [
        {
          title: "Function Types",
          duration: 11,
          videoUrl: "https://www.youtube.com/watch?v=zQnBQ4tB3ZA",
          content: "<h2>Typing Functions</h2><p>TypeScript lets you type function parameters, return values, and even the function itself.</p><pre><code>function add(a: number, b: number): number {\n  return a + b;\n}\n\nconst multiply: (a: number, b: number) => number = (a, b) => a * b;</code></pre>",
        },
        {
          title: "Generics Basics",
          duration: 20,
          videoUrl: "https://www.youtube.com/watch?v=zQnBQ4tB3ZA",
          content: "<h2>Introduction to Generics</h2><p>Generics let you write reusable code that works with multiple types while maintaining type safety.</p><pre><code>function identity&lt;T&gt;(value: T): T {\n  return value;\n}\n\nconst str = identity('hello'); // string\nconst num = identity(42); // number</code></pre>",
        },
        {
          title: "Generic Constraints",
          duration: 16,
          videoUrl: "https://www.youtube.com/watch?v=zQnBQ4tB3ZA",
          content: "<h2>Constraining Generics</h2><p>Use <code>extends</code> to limit what types a generic can accept.</p><pre><code>function getLength&lt;T extends { length: number }&gt;(item: T): number {\n  return item.length;\n}\n\ngetLength('hello'); // OK\ngetLength([1, 2, 3]); // OK\n// getLength(42); // Error!</code></pre>",
        },
        {
          title: "Utility Types",
          duration: 15,
          videoUrl: "https://www.youtube.com/watch?v=zQnBQ4tB3ZA",
          content: "<h2>Built-in Utility Types</h2><p>TypeScript provides several utility types for common type transformations.</p><ul><li><code>Partial&lt;T&gt;</code> — makes all properties optional</li><li><code>Required&lt;T&gt;</code> — makes all properties required</li><li><code>Pick&lt;T, K&gt;</code> — selects specific properties</li><li><code>Omit&lt;T, K&gt;</code> — excludes specific properties</li><li><code>Record&lt;K, V&gt;</code> — creates an object type with keys K and values V</li></ul>",
        },
      ],
    },
    {
      title: "Advanced Patterns",
      lessons: [
        {
          title: "Discriminated Unions",
          duration: 14,
          videoUrl: "https://www.youtube.com/watch?v=zQnBQ4tB3ZA",
          content: "<h2>Discriminated Unions</h2><p>A pattern that combines union types with literal types to create type-safe tagged unions.</p><pre><code>type Shape =\n  | { kind: 'circle'; radius: number }\n  | { kind: 'rectangle'; width: number; height: number };\n\nfunction area(shape: Shape): number {\n  switch (shape.kind) {\n    case 'circle': return Math.PI * shape.radius ** 2;\n    case 'rectangle': return shape.width * shape.height;\n  }\n}</code></pre>",
        },
        {
          title: "Type Guards and Narrowing",
          duration: 13,
          videoUrl: "https://www.youtube.com/watch?v=zQnBQ4tB3ZA",
          content: "<h2>Type Guards</h2><p>Type guards are expressions that narrow a type within a conditional block.</p><pre><code>function isString(value: unknown): value is string {\n  return typeof value === 'string';\n}\n\nfunction process(value: string | number) {\n  if (isString(value)) {\n    console.log(value.toUpperCase()); // string\n  } else {\n    console.log(value.toFixed(2)); // number\n  }\n}</code></pre>",
        },
        {
          title: "Mapped Types",
          duration: 17,
          videoUrl: "https://www.youtube.com/watch?v=zQnBQ4tB3ZA",
          content: "<h2>Mapped Types</h2><p>Create new types by transforming each property of an existing type.</p><pre><code>type Readonly&lt;T&gt; = {\n  readonly [K in keyof T]: T[K];\n};\n\ntype Optional&lt;T&gt; = {\n  [K in keyof T]?: T[K];\n};</code></pre>",
        },
        {
          title: "Conditional Types",
          duration: 19,
          videoUrl: "https://www.youtube.com/watch?v=zQnBQ4tB3ZA",
          content: "<h2>Conditional Types</h2><p>Types that depend on a condition, similar to ternary expressions but at the type level.</p><pre><code>type IsString&lt;T&gt; = T extends string ? true : false;\n\ntype A = IsString&lt;'hello'&gt;; // true\ntype B = IsString&lt;42&gt;; // false</code></pre>",
        },
        {
          title: "Template Literal Types",
          duration: 10,
          videoUrl: "https://www.youtube.com/watch?v=zQnBQ4tB3ZA",
          content: "<h2>Template Literal Types</h2><p>Construct string types using template literal syntax.</p><pre><code>type Color = 'red' | 'blue' | 'green';\ntype CSSProperty = `color-${Color}`;\n// 'color-red' | 'color-blue' | 'color-green'</code></pre>",
        },
      ],
    },
    {
      title: "Real-World TypeScript",
      lessons: [
        {
          title: "TypeScript with React",
          duration: 22,
          videoUrl: "https://www.youtube.com/watch?v=zQnBQ4tB3ZA",
          content: "<h2>TypeScript + React</h2><p>Learn how to use TypeScript effectively in React applications.</p><pre><code>interface ButtonProps {\n  label: string;\n  onClick: () => void;\n  variant?: 'primary' | 'secondary';\n}\n\nfunction Button({ label, onClick, variant = 'primary' }: ButtonProps) {\n  return &lt;button onClick={onClick} className={variant}&gt;{label}&lt;/button&gt;;\n}</code></pre>",
        },
        {
          title: "Error Handling Patterns",
          duration: 14,
          videoUrl: "https://www.youtube.com/watch?v=zQnBQ4tB3ZA",
          content: "<h2>Error Handling in TypeScript</h2><p>Strategies for handling errors in a type-safe way.</p><pre><code>type Result&lt;T, E = Error&gt; =\n  | { ok: true; value: T }\n  | { ok: false; error: E };\n\nfunction divide(a: number, b: number): Result&lt;number&gt; {\n  if (b === 0) return { ok: false, error: new Error('Division by zero') };\n  return { ok: true, value: a / b };\n}</code></pre>",
        },
        {
          title: "Course Wrap-Up and Next Steps",
          duration: 8,
          content: "<h2>Congratulations!</h2><p>You've completed the Introduction to TypeScript course. Here's what we covered:</p><ul><li>TypeScript fundamentals and type system</li><li>Functions, generics, and utility types</li><li>Advanced patterns like discriminated unions and mapped types</li><li>Real-world usage with React</li></ul><h3>Next Steps</h3><p>Practice by converting an existing JavaScript project to TypeScript. Start with strict mode enabled and work through the errors one by one.</p>",
        },
      ],
    },
  ];

  const course1LessonIds: number[] = [];

  for (let mi = 0; mi < c1Modules.length; mi++) {
    const modData = c1Modules[mi];
    const [mod] = db
      .insert(schema.modules)
      .values({
        courseId: course1.id,
        title: modData.title,
        position: mi + 1,
        createdAt: daysAgo(90 - mi),
      })
      .returning()
      .all();

    for (let li = 0; li < modData.lessons.length; li++) {
      const lessonData = modData.lessons[li];
      const [lesson] = db
        .insert(schema.lessons)
        .values({
          moduleId: mod.id,
          title: lessonData.title,
          contentHtml: lessonData.content,
          videoUrl: lessonData.videoUrl ?? null,
          position: li + 1,
          durationMinutes: lessonData.duration,
          createdAt: daysAgo(90 - mi),
        })
        .returning()
        .all();
      course1LessonIds.push(lesson.id);
    }
  }

  console.log(
    `Created course "${course1.title}" with ${c1Modules.length} modules and ${course1LessonIds.length} lessons.`
  );

  // ─── Course 2: Building REST APIs with Node.js (Marcus Johnson) ───

  const [course2] = db
    .insert(schema.courses)
    .values({
      title: "Building REST APIs with Node.js",
      slug: "building-rest-apis-with-nodejs",
      description:
        "Learn to build production-ready REST APIs using Node.js and Express. Covers routing, middleware, authentication, database integration, error handling, testing, and deployment best practices.",
      instructorId: instructor2.id,
      categoryId: catBySlug["programming"].id,
      status: CourseStatus.Published,
      coverImageUrl: "https://picsum.photos/seed/nodejs-api/800/400",
      createdAt: daysAgo(75),
      updatedAt: daysAgo(5),
    })
    .returning()
    .all();

  const c2Modules = [
    {
      title: "API Fundamentals",
      lessons: [
        {
          title: "What is a REST API?",
          duration: 10,
          videoUrl: "https://www.youtube.com/watch?v=lsMQRaeKNDk",
          content: "<h2>REST API Fundamentals</h2><p>REST (Representational State Transfer) is an architectural style for designing networked applications. RESTful APIs use HTTP methods to perform CRUD operations on resources.</p><h3>Key Principles</h3><ul><li>Stateless communication</li><li>Resource-based URLs</li><li>Standard HTTP methods (GET, POST, PUT, DELETE)</li><li>JSON as the data format</li></ul>",
        },
        {
          title: "Setting Up Express",
          duration: 15,
          videoUrl: "https://www.youtube.com/watch?v=lsMQRaeKNDk",
          content: "<h2>Express.js Setup</h2><p>Express is the most popular Node.js web framework for building APIs.</p><pre><code>import express from 'express';\n\nconst app = express();\napp.use(express.json());\n\napp.get('/api/health', (req, res) => {\n  res.json({ status: 'ok' });\n});\n\napp.listen(3000, () => console.log('Server running on port 3000'));</code></pre>",
        },
        {
          title: "HTTP Methods and Status Codes",
          duration: 12,
          videoUrl: "https://www.youtube.com/watch?v=lsMQRaeKNDk",
          content: "<h2>HTTP Methods</h2><ul><li><strong>GET</strong> — Retrieve resources (200 OK)</li><li><strong>POST</strong> — Create resources (201 Created)</li><li><strong>PUT</strong> — Update resources (200 OK)</li><li><strong>DELETE</strong> — Remove resources (204 No Content)</li></ul><h3>Common Status Codes</h3><ul><li>200 OK, 201 Created, 204 No Content</li><li>400 Bad Request, 401 Unauthorized, 404 Not Found</li><li>500 Internal Server Error</li></ul>",
        },
        {
          title: "Request and Response Objects",
          duration: 14,
          videoUrl: "https://www.youtube.com/watch?v=lsMQRaeKNDk",
          content: "<h2>Working with Request & Response</h2><p>Express provides rich request and response objects for handling HTTP communication.</p><pre><code>app.post('/api/users', (req, res) => {\n  const { name, email } = req.body;\n  // ... create user\n  res.status(201).json({ id: 1, name, email });\n});</code></pre>",
        },
      ],
    },
    {
      title: "Routing and Middleware",
      lessons: [
        {
          title: "Express Router",
          duration: 13,
          videoUrl: "https://www.youtube.com/watch?v=lsMQRaeKNDk",
          content: "<h2>Organizing Routes</h2><p>Use Express Router to organize your API endpoints into logical groups.</p><pre><code>import { Router } from 'express';\n\nconst userRouter = Router();\nuserRouter.get('/', getUsers);\nuserRouter.get('/:id', getUserById);\nuserRouter.post('/', createUser);\n\napp.use('/api/users', userRouter);</code></pre>",
        },
        {
          title: "Custom Middleware",
          duration: 16,
          videoUrl: "https://www.youtube.com/watch?v=lsMQRaeKNDk",
          content: "<h2>Middleware in Express</h2><p>Middleware functions have access to the request, response, and next function in the request-response cycle.</p><pre><code>function logger(req, res, next) {\n  console.log(`${req.method} ${req.url}`);\n  next();\n}\n\nfunction authenticate(req, res, next) {\n  const token = req.headers.authorization;\n  if (!token) return res.status(401).json({ error: 'Unauthorized' });\n  next();\n}</code></pre>",
        },
        {
          title: "Error Handling Middleware",
          duration: 11,
          videoUrl: "https://www.youtube.com/watch?v=lsMQRaeKNDk",
          content: "<h2>Centralized Error Handling</h2><p>Express supports error-handling middleware with four parameters.</p><pre><code>app.use((err, req, res, next) => {\n  console.error(err.stack);\n  res.status(err.status || 500).json({\n    error: err.message || 'Internal Server Error'\n  });\n});</code></pre>",
        },
        {
          title: "Validation with Zod",
          duration: 18,
          videoUrl: "https://www.youtube.com/watch?v=lsMQRaeKNDk",
          content: "<h2>Request Validation</h2><p>Use Zod to validate request bodies, query parameters, and URL parameters.</p><pre><code>import { z } from 'zod';\n\nconst CreateUserSchema = z.object({\n  name: z.string().min(1),\n  email: z.string().email(),\n  age: z.number().int().positive().optional()\n});\n\napp.post('/api/users', (req, res) => {\n  const result = CreateUserSchema.safeParse(req.body);\n  if (!result.success) return res.status(400).json(result.error);\n  // ... create user with result.data\n});</code></pre>",
        },
      ],
    },
    {
      title: "Database Integration",
      lessons: [
        {
          title: "Connecting to a Database",
          duration: 14,
          videoUrl: "https://www.youtube.com/watch?v=lsMQRaeKNDk",
          content: "<h2>Database Setup</h2><p>Learn how to connect your API to a database using an ORM.</p><pre><code>import { drizzle } from 'drizzle-orm/better-sqlite3';\nimport Database from 'better-sqlite3';\n\nconst sqlite = new Database('app.db');\nconst db = drizzle(sqlite);</code></pre>",
        },
        {
          title: "CRUD Operations",
          duration: 20,
          videoUrl: "https://www.youtube.com/watch?v=lsMQRaeKNDk",
          content: "<h2>Building CRUD Endpoints</h2><p>Implement Create, Read, Update, Delete operations for your API resources.</p><pre><code>// Create\napp.post('/api/posts', async (req, res) => {\n  const post = await db.insert(posts).values(req.body).returning();\n  res.status(201).json(post);\n});\n\n// Read\napp.get('/api/posts/:id', async (req, res) => {\n  const post = await db.select().from(posts).where(eq(posts.id, req.params.id));\n  if (!post) return res.status(404).json({ error: 'Not found' });\n  res.json(post);\n});</code></pre>",
        },
        {
          title: "Pagination and Filtering",
          duration: 15,
          videoUrl: "https://www.youtube.com/watch?v=lsMQRaeKNDk",
          content: "<h2>Pagination</h2><p>Implement cursor-based and offset-based pagination for list endpoints.</p><pre><code>app.get('/api/posts', async (req, res) => {\n  const page = parseInt(req.query.page) || 1;\n  const limit = parseInt(req.query.limit) || 10;\n  const offset = (page - 1) * limit;\n\n  const results = await db.select().from(posts)\n    .limit(limit).offset(offset);\n  res.json({ data: results, page, limit });\n});</code></pre>",
        },
        {
          title: "Transactions",
          duration: 12,
          videoUrl: "https://www.youtube.com/watch?v=lsMQRaeKNDk",
          content: "<h2>Database Transactions</h2><p>Use transactions to ensure data consistency when multiple operations must succeed or fail together.</p><pre><code>await db.transaction(async (tx) => {\n  const [order] = await tx.insert(orders).values({ userId, total }).returning();\n  for (const item of items) {\n    await tx.insert(orderItems).values({ orderId: order.id, ...item });\n  }\n});</code></pre>",
        },
      ],
    },
    {
      title: "Authentication and Security",
      lessons: [
        {
          title: "JWT Authentication",
          duration: 22,
          videoUrl: "https://www.youtube.com/watch?v=lsMQRaeKNDk",
          content: "<h2>JSON Web Tokens</h2><p>Implement JWT-based authentication for your API.</p><pre><code>import jwt from 'jsonwebtoken';\n\napp.post('/api/login', async (req, res) => {\n  const user = await findUser(req.body.email);\n  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {\n    expiresIn: '7d'\n  });\n  res.json({ token });\n});</code></pre>",
        },
        {
          title: "Rate Limiting",
          duration: 10,
          videoUrl: "https://www.youtube.com/watch?v=lsMQRaeKNDk",
          content: "<h2>Rate Limiting</h2><p>Protect your API from abuse by limiting the number of requests per client.</p><pre><code>import rateLimit from 'express-rate-limit';\n\nconst limiter = rateLimit({\n  windowMs: 15 * 60 * 1000, // 15 minutes\n  max: 100 // limit each IP to 100 requests per window\n});\n\napp.use('/api/', limiter);</code></pre>",
        },
        {
          title: "CORS and Security Headers",
          duration: 11,
          videoUrl: "https://www.youtube.com/watch?v=lsMQRaeKNDk",
          content: "<h2>CORS Configuration</h2><p>Configure Cross-Origin Resource Sharing for your API.</p><pre><code>import cors from 'cors';\nimport helmet from 'helmet';\n\napp.use(cors({ origin: 'https://yourapp.com' }));\napp.use(helmet());</code></pre>",
        },
      ],
    },
    {
      title: "Testing and Deployment",
      lessons: [
        {
          title: "Unit Testing API Routes",
          duration: 18,
          videoUrl: "https://www.youtube.com/watch?v=lsMQRaeKNDk",
          content: "<h2>Testing with Vitest and Supertest</h2><p>Write tests for your API endpoints using Vitest and Supertest.</p><pre><code>import { describe, it, expect } from 'vitest';\nimport request from 'supertest';\nimport app from '../app';\n\ndescribe('GET /api/users', () => {\n  it('returns a list of users', async () => {\n    const res = await request(app).get('/api/users');\n    expect(res.status).toBe(200);\n    expect(res.body).toBeInstanceOf(Array);\n  });\n});</code></pre>",
        },
        {
          title: "Integration Testing",
          duration: 16,
          videoUrl: "https://www.youtube.com/watch?v=lsMQRaeKNDk",
          content: "<h2>Integration Tests</h2><p>Test complete request flows including database interactions.</p><pre><code>describe('User CRUD', () => {\n  it('creates and retrieves a user', async () => {\n    const createRes = await request(app)\n      .post('/api/users')\n      .send({ name: 'Test', email: 'test@test.com' });\n    expect(createRes.status).toBe(201);\n\n    const getRes = await request(app)\n      .get(`/api/users/${createRes.body.id}`);\n    expect(getRes.body.name).toBe('Test');\n  });\n});</code></pre>",
        },
        {
          title: "Environment Variables and Config",
          duration: 9,
          videoUrl: "https://www.youtube.com/watch?v=lsMQRaeKNDk",
          content: "<h2>Configuration Management</h2><p>Manage environment-specific settings with environment variables.</p><pre><code>const config = {\n  port: process.env.PORT || 3000,\n  dbUrl: process.env.DATABASE_URL || 'sqlite:app.db',\n  jwtSecret: process.env.JWT_SECRET || 'dev-secret'\n};</code></pre>",
        },
        {
          title: "Deploying Your API",
          duration: 14,
          videoUrl: "https://www.youtube.com/watch?v=lsMQRaeKNDk",
          content: "<h2>Deployment</h2><p>Deploy your Node.js API to production. We'll cover various hosting options and best practices.</p><h3>Deployment Checklist</h3><ul><li>Set NODE_ENV=production</li><li>Use a process manager (PM2)</li><li>Set up logging and monitoring</li><li>Configure HTTPS</li><li>Set up CI/CD pipeline</li></ul>",
        },
        {
          title: "Course Wrap-Up",
          duration: 7,
          content: "<h2>Congratulations!</h2><p>You've completed the Building REST APIs course. You now have the skills to build, test, and deploy production-ready APIs with Node.js.</p><h3>Key Takeaways</h3><ul><li>RESTful design principles</li><li>Express routing and middleware</li><li>Database integration and transactions</li><li>Authentication and security</li><li>Testing and deployment</li></ul>",
        },
      ],
    },
  ];

  const course2LessonIds: number[] = [];

  for (let mi = 0; mi < c2Modules.length; mi++) {
    const modData = c2Modules[mi];
    const [mod] = db
      .insert(schema.modules)
      .values({
        courseId: course2.id,
        title: modData.title,
        position: mi + 1,
        createdAt: daysAgo(75 - mi),
      })
      .returning()
      .all();

    for (let li = 0; li < modData.lessons.length; li++) {
      const lessonData = modData.lessons[li];
      const [lesson] = db
        .insert(schema.lessons)
        .values({
          moduleId: mod.id,
          title: lessonData.title,
          contentHtml: lessonData.content,
          videoUrl: lessonData.videoUrl ?? null,
          position: li + 1,
          durationMinutes: lessonData.duration,
          createdAt: daysAgo(75 - mi),
        })
        .returning()
        .all();
      course2LessonIds.push(lesson.id);
    }
  }

  console.log(
    `Created course "${course2.title}" with ${c2Modules.length} modules and ${course2LessonIds.length} lessons.`
  );

  // ─── Quizzes ───
  // Add quizzes to some lessons in both courses

  // Quiz 1: TypeScript Basics Quiz (attached to "Your First TypeScript Program", lesson 3 of course 1)
  const [quiz1] = db
    .insert(schema.quizzes)
    .values({
      lessonId: course1LessonIds[2], // "Your First TypeScript Program"
      title: "TypeScript Basics Quiz",
      passingScore: 0.7,
    })
    .returning()
    .all();

  const quiz1Questions = [
    {
      text: "What does TypeScript compile to?",
      type: QuestionType.MultipleChoice,
      options: [
        { text: "JavaScript", correct: true },
        { text: "WebAssembly", correct: false },
        { text: "Java bytecode", correct: false },
        { text: "Machine code", correct: false },
      ],
    },
    {
      text: "TypeScript is a superset of JavaScript.",
      type: QuestionType.TrueFalse,
      options: [
        { text: "True", correct: true },
        { text: "False", correct: false },
      ],
    },
    {
      text: "Which file configures the TypeScript compiler?",
      type: QuestionType.MultipleChoice,
      options: [
        { text: "tsconfig.json", correct: true },
        { text: "package.json", correct: false },
        { text: "typescript.config.js", correct: false },
        { text: ".tsrc", correct: false },
      ],
    },
  ];

  const quiz1OptionIds: { questionId: number; optionId: number; correct: boolean }[] = [];

  for (let qi = 0; qi < quiz1Questions.length; qi++) {
    const q = quiz1Questions[qi];
    const [question] = db
      .insert(schema.quizQuestions)
      .values({
        quizId: quiz1.id,
        questionText: q.text,
        questionType: q.type,
        position: qi + 1,
      })
      .returning()
      .all();

    for (const opt of q.options) {
      const [option] = db
        .insert(schema.quizOptions)
        .values({
          questionId: question.id,
          optionText: opt.text,
          isCorrect: opt.correct,
        })
        .returning()
        .all();
      quiz1OptionIds.push({
        questionId: question.id,
        optionId: option.id,
        correct: opt.correct,
      });
    }
  }

  // Quiz 2: Generics Quiz (attached to "Generics Basics", lesson index 5 in course 1)
  const [quiz2] = db
    .insert(schema.quizzes)
    .values({
      lessonId: course1LessonIds[7], // "Generics Basics" (module 3, lesson 2)
      title: "Generics Knowledge Check",
      passingScore: 0.6,
    })
    .returning()
    .all();

  const quiz2Questions = [
    {
      text: "What is the primary benefit of generics?",
      type: QuestionType.MultipleChoice,
      options: [
        { text: "Code reusability with type safety", correct: true },
        { text: "Faster execution speed", correct: false },
        { text: "Smaller bundle size", correct: false },
        { text: "Better error messages", correct: false },
      ],
    },
    {
      text: "Generic type parameters can be constrained using the 'extends' keyword.",
      type: QuestionType.TrueFalse,
      options: [
        { text: "True", correct: true },
        { text: "False", correct: false },
      ],
    },
  ];

  const quiz2OptionIds: { questionId: number; optionId: number; correct: boolean }[] = [];

  for (let qi = 0; qi < quiz2Questions.length; qi++) {
    const q = quiz2Questions[qi];
    const [question] = db
      .insert(schema.quizQuestions)
      .values({
        quizId: quiz2.id,
        questionText: q.text,
        questionType: q.type,
        position: qi + 1,
      })
      .returning()
      .all();

    for (const opt of q.options) {
      const [option] = db
        .insert(schema.quizOptions)
        .values({
          questionId: question.id,
          optionText: opt.text,
          isCorrect: opt.correct,
        })
        .returning()
        .all();
      quiz2OptionIds.push({
        questionId: question.id,
        optionId: option.id,
        correct: opt.correct,
      });
    }
  }

  // Quiz 3: REST API Basics (attached to "HTTP Methods and Status Codes", lesson index 2 in course 2)
  const [quiz3] = db
    .insert(schema.quizzes)
    .values({
      lessonId: course2LessonIds[2], // "HTTP Methods and Status Codes"
      title: "HTTP Methods Quiz",
      passingScore: 0.7,
    })
    .returning()
    .all();

  const quiz3Questions = [
    {
      text: "Which HTTP method is used to create a new resource?",
      type: QuestionType.MultipleChoice,
      options: [
        { text: "POST", correct: true },
        { text: "GET", correct: false },
        { text: "PUT", correct: false },
        { text: "PATCH", correct: false },
      ],
    },
    {
      text: "A 404 status code means the server encountered an internal error.",
      type: QuestionType.TrueFalse,
      options: [
        { text: "True", correct: false },
        { text: "False", correct: true },
      ],
    },
    {
      text: "Which status code indicates successful resource creation?",
      type: QuestionType.MultipleChoice,
      options: [
        { text: "201 Created", correct: true },
        { text: "200 OK", correct: false },
        { text: "204 No Content", correct: false },
        { text: "202 Accepted", correct: false },
      ],
    },
  ];

  const quiz3OptionIds: { questionId: number; optionId: number; correct: boolean }[] = [];

  for (let qi = 0; qi < quiz3Questions.length; qi++) {
    const q = quiz3Questions[qi];
    const [question] = db
      .insert(schema.quizQuestions)
      .values({
        quizId: quiz3.id,
        questionText: q.text,
        questionType: q.type,
        position: qi + 1,
      })
      .returning()
      .all();

    for (const opt of q.options) {
      const [option] = db
        .insert(schema.quizOptions)
        .values({
          questionId: question.id,
          optionText: opt.text,
          isCorrect: opt.correct,
        })
        .returning()
        .all();
      quiz3OptionIds.push({
        questionId: question.id,
        optionId: option.id,
        correct: opt.correct,
      });
    }
  }

  console.log("Created 3 quizzes with questions and options.");

  // ─── Enrollments ───
  // Varied enrollment patterns:
  // - Emma: enrolled in both courses (nearly complete in course 1, mid-way in course 2)
  // - James: enrolled in course 1 only (completed)
  // - Olivia: enrolled in both courses (just started course 1, mid-way in course 2)
  // - Liam: enrolled in course 2 only (just started, abandoned)
  // - Sophia: enrolled in course 1 only (recently enrolled, barely started)

  db.insert(schema.enrollments)
    .values([
      { userId: students[0].id, courseId: course1.id, enrolledAt: daysAgo(50) },
      { userId: students[0].id, courseId: course2.id, enrolledAt: daysAgo(40) },
      {
        userId: students[1].id,
        courseId: course1.id,
        enrolledAt: daysAgo(45),
        completedAt: daysAgo(10),
      },
      { userId: students[2].id, courseId: course1.id, enrolledAt: daysAgo(35) },
      { userId: students[2].id, courseId: course2.id, enrolledAt: daysAgo(30) },
      { userId: students[3].id, courseId: course2.id, enrolledAt: daysAgo(25) },
      { userId: students[4].id, courseId: course1.id, enrolledAt: daysAgo(15) },
    ])
    .run();

  console.log("Created 7 enrollments.");

  // ─── Lesson Progress ───

  // Helper to mark lessons as complete
  function markComplete(userId: number, lessonId: number, daysAgoCompleted: number) {
    db.insert(schema.lessonProgress)
      .values({
        userId,
        lessonId,
        status: LessonProgressStatus.Completed,
        completedAt: daysAgo(daysAgoCompleted),
      })
      .run();
  }

  function markInProgress(userId: number, lessonId: number) {
    db.insert(schema.lessonProgress)
      .values({
        userId,
        lessonId,
        status: LessonProgressStatus.InProgress,
      })
      .run();
  }

  // Emma (students[0]) — nearly complete in course 1 (17 of 19 lessons done)
  for (let i = 0; i < 17; i++) {
    markComplete(students[0].id, course1LessonIds[i], 50 - i);
  }
  markInProgress(students[0].id, course1LessonIds[17]);

  // Emma — mid-way through course 2 (10 of 20 lessons done)
  for (let i = 0; i < 10; i++) {
    markComplete(students[0].id, course2LessonIds[i], 40 - i);
  }
  markInProgress(students[0].id, course2LessonIds[10]);

  // James (students[1]) — completed all of course 1
  for (let i = 0; i < course1LessonIds.length; i++) {
    markComplete(students[1].id, course1LessonIds[i], 45 - i);
  }

  // Olivia (students[2]) — just started course 1 (3 lessons done)
  for (let i = 0; i < 3; i++) {
    markComplete(students[2].id, course1LessonIds[i], 30 - i);
  }
  markInProgress(students[2].id, course1LessonIds[3]);

  // Olivia — mid-way through course 2 (8 lessons done)
  for (let i = 0; i < 8; i++) {
    markComplete(students[2].id, course2LessonIds[i], 28 - i);
  }

  // Liam (students[3]) — just started course 2, abandoned (2 lessons done)
  for (let i = 0; i < 2; i++) {
    markComplete(students[3].id, course2LessonIds[i], 22 - i);
  }

  // Sophia (students[4]) — barely started course 1 (1 lesson done)
  markComplete(students[4].id, course1LessonIds[0], 12);
  markInProgress(students[4].id, course1LessonIds[1]);

  console.log("Created lesson progress records.");

  // ─── Quiz Attempts ───

  // Helper to record a quiz attempt with answers
  function recordQuizAttempt(
    userId: number,
    quizId: number,
    optionIds: { questionId: number; optionId: number; correct: boolean }[],
    selectedCorrectIndices: number[], // which questions (0-based) the student got right
    attemptDaysAgo: number
  ) {
    const totalQuestions = new Set(optionIds.map((o) => o.questionId)).size;
    const correctCount = selectedCorrectIndices.length;
    const score = correctCount / totalQuestions;

    // Determine passing based on quiz passingScore (we'll just use 0.7 as default)
    const passed = score >= 0.7;

    const [attempt] = db
      .insert(schema.quizAttempts)
      .values({
        userId,
        quizId,
        score,
        passed,
        attemptedAt: daysAgo(attemptDaysAgo),
      })
      .returning()
      .all();

    // Build answer selections
    const questionIds = [...new Set(optionIds.map((o) => o.questionId))];
    for (let qi = 0; qi < questionIds.length; qi++) {
      const qId = questionIds[qi];
      const qOptions = optionIds.filter((o) => o.questionId === qId);
      let selectedOption: typeof qOptions[0];

      if (selectedCorrectIndices.includes(qi)) {
        // Pick correct answer
        selectedOption = qOptions.find((o) => o.correct)!;
      } else {
        // Pick wrong answer
        selectedOption = qOptions.find((o) => !o.correct)!;
      }

      db.insert(schema.quizAnswers)
        .values({
          attemptId: attempt.id,
          questionId: qId,
          selectedOptionId: selectedOption.optionId,
        })
        .run();
    }
  }

  // Emma — passed quiz 1 (3/3 correct)
  recordQuizAttempt(students[0].id, quiz1.id, quiz1OptionIds, [0, 1, 2], 35);

  // Emma — passed quiz 2 (2/2 correct)
  recordQuizAttempt(students[0].id, quiz2.id, quiz2OptionIds, [0, 1], 30);

  // Emma — passed quiz 3 (2/3 correct, just barely at 67% with 70% passing = fail, then retake)
  recordQuizAttempt(students[0].id, quiz3.id, quiz3OptionIds, [0, 2], 28);
  // Retake — all correct
  recordQuizAttempt(students[0].id, quiz3.id, quiz3OptionIds, [0, 1, 2], 27);

  // James — passed quiz 1 (3/3 correct)
  recordQuizAttempt(students[1].id, quiz1.id, quiz1OptionIds, [0, 1, 2], 40);

  // James — passed quiz 2 (2/2 correct)
  recordQuizAttempt(students[1].id, quiz2.id, quiz2OptionIds, [0, 1], 35);

  // Olivia — failed quiz 1 first attempt (1/3 correct), then passed on retry (3/3)
  recordQuizAttempt(students[2].id, quiz1.id, quiz1OptionIds, [0], 25);
  recordQuizAttempt(students[2].id, quiz1.id, quiz1OptionIds, [0, 1, 2], 24);

  // Olivia — passed quiz 3 (3/3 correct)
  recordQuizAttempt(students[2].id, quiz3.id, quiz3OptionIds, [0, 1, 2], 20);

  // Sophia — failed quiz 1 (1/3 correct, hasn't retaken yet)
  recordQuizAttempt(students[4].id, quiz1.id, quiz1OptionIds, [1], 10);

  console.log("Created quiz attempts and answers.");

  // ─── Video Watch Events ───
  // Sprinkle some realistic watch events

  function addWatchEvent(
    userId: number,
    lessonId: number,
    eventType: string,
    positionSeconds: number,
    eventDaysAgo: number
  ) {
    db.insert(schema.videoWatchEvents)
      .values({
        userId,
        lessonId,
        eventType,
        positionSeconds,
        createdAt: daysAgo(eventDaysAgo),
      })
      .run();
  }

  // Emma watching course 1 lesson 1 (8 min video)
  addWatchEvent(students[0].id, course1LessonIds[0], "play", 0, 50);
  addWatchEvent(students[0].id, course1LessonIds[0], "pause", 180, 50);
  addWatchEvent(students[0].id, course1LessonIds[0], "play", 180, 49);
  addWatchEvent(students[0].id, course1LessonIds[0], "ended", 480, 49);

  // James watching course 1 lesson 1
  addWatchEvent(students[1].id, course1LessonIds[0], "play", 0, 45);
  addWatchEvent(students[1].id, course1LessonIds[0], "ended", 480, 45);

  // Liam started watching course 2 lesson 1 but stopped mid-way
  addWatchEvent(students[3].id, course2LessonIds[0], "play", 0, 22);
  addWatchEvent(students[3].id, course2LessonIds[0], "pause", 300, 22);
  addWatchEvent(students[3].id, course2LessonIds[0], "seek", 150, 21);
  addWatchEvent(students[3].id, course2LessonIds[0], "play", 150, 21);
  addWatchEvent(students[3].id, course2LessonIds[0], "pause", 360, 21);

  console.log("Created video watch events.");

  console.log("\n✓ Seed complete!");
  console.log("  Users: 8 (1 admin, 2 instructors, 5 students)");
  console.log("  Categories: 5");
  console.log(`  Courses: 2 (${course1LessonIds.length} + ${course2LessonIds.length} lessons)`);
  console.log("  Quizzes: 3");
  console.log("  Enrollments: 7");
}

seed().catch(console.error);
