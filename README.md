💬 Swerks Socket

A real-time virtual classroom backend built with Node.js, TypeScript, Express, Socket.IO, and MongoDB. This application enables live classroom sessions, participant tracking, event logging, and classroom state management with robust REST and WebSocket support.
🚀 Features

    Real-time communication using Socket.IO

    Classroom creation & session management

    Role-based participation (Student / Teacher)

    Live join/leave events and classroom state sync

    MongoDB-based persistent storage

    Clean architecture with TypeScript

    Centralized error handling and validation

    Logger integration with Winston

    RESTful APIs for classroom reports

🛠 Tech Stack

    Node.js + Express

    TypeScript

    MongoDB + Mongoose

    Socket.IO

    Vite + React.js

    Joi for schema validation

    Winston for logging

    Morgan for request logging

    Dotenv for environment configs

📦 Installation

Backend: 

git clone https://github.com/pverma911/swerks-socket.git
cd swerks-socket
npm install
npm run dev

Frontend:

git clone https://github.com/pverma911/swerks-socket-vite
cd swerks-socket-vite
npm install
npm run dev


🔧 Development

Start the server in development mode:

npm run dev

Make sure MongoDB is running locally at mongodb://localhost:27017/virtual-classroom or set the MONGODB_URI in your .env.
📁 Folder Structure

src/
  ├── config/             # DB config
  ├── controllers/        # REST API controllers
  ├── services/           # Business logic and socket handlers
  ├── models/             # Mongoose schemas
  ├── routes/             # Express routes
  ├── enums/              # Reusable enums
  ├── interfaces/         # TypeScript interfaces
  ├── errors/             # Custom error handling
  ├── middlewares/        # Request validation, error handler
  ├── utils/              # Logger utility
  └── validators/         # Joi validators

📡 Sample API Requests
➕ Create Classroom

POST /classroom/create
Request Body

{
  "name": "Math Class - 9AM"
}

Response

{
  "success": true,
  "statusCode": 201,
  "message": "Class room created",
  "data": {
    "roomId": "665f429fa126cd134de123a4"
  }
}

NOTE: In the Enter Room ID please enter the classroom mongo _id in it.

📄 Get Classroom Report

GET /classroom/report/:roomId
Response

{
  "success": true,
  "statusCode": 200,
  "message": "Class room report retrieved successfully",
  "data": {
    "classRoom": {
      "name": "Math Class - 9AM",
      "roomId": "665f429fa126cd134de123a4",
      "eventLog": [
        {
          "type": "join",
          "name": "John Doe",
          "role": "Student",
          "timestamp": "2025-06-22 09:00:00"
        }
      ],
      "sessions": [
        {
          "startedAt": "2025-06-22 09:00:00",
          "endedAt": "2025-06-22 10:00:00",
          "eventLog": [...]
        }
      ]
    }
  }
}

📡 WebSocket Events
Event Name	Description
join-classroom	Participant joins the room
leave-classroom	Participant leaves the room
start-class	Teacher starts the class
end-class	Teacher ends the class
get-user	Fetch participant by email
get-active-sessions	List all ongoing sessions
classroom-updated	Room-wide state update broadcast

🧪 Testing

    Test setup is ready. use "npm test" to run all test cases.
