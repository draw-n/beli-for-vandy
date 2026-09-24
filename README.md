# beli-for-vandy

Contributors: Eileen Luo: eileen.luo@vanderbilt.edu, Helen Wu: helen.wu@vanderbilt.edu, Ashley Lai: ashley.lai@vanderbilt.edu, Sara Ota: sara.ota@vanderbilt.edu, Terra Jang: terra.jang@vanderbilt.edu

## About our project
Have you ever felt like you wasted a meal swipe at a Vanderbilt dining hall? Would you like to know what dishes are before you step foot in line? Do you have friends who try the new dining hall foods more often than you do? Introducing Beli for Vanderbilt: an application to see which foods are enjoyed by your friends! Like Beli, this is a reviewing application to allow users to share ratings and reviews of each Vanderbilt dining hall and individual meals. Open to any faculty, staff and student at Vanderbilt University, it is the perfect way to verify another user’s opinion before trying something new.

## Core Features
- Create account
- View list of Vanderbilt dining halls with pictures to explore
- Add/remove new friends
- Be able to check friends' ratings and reviews
- Write own reviews on dining halls and filter by breakfast, lunch, and dinner

## Technologies
- MongoDB: uses a JSON format which is highly compatible with HTTP requests/responses
- Python: all of us have considerable experience with writing Python
- FastAPI
- Angular.js: This is a framework none of the members have tried previously
- TypeScript: great for ensuring we stick to consistent types, so there’s no unexpected field behavior
- Vercel: We will be deploying the project in Vercel since it provides a free hosting service for servers as long as they remain hobbyist projects (low traffic)
- (MongoDB) Atlas: database since it is also free with hobbyist projects

## Project Structure

```text
beli-for-vandy/
├── backend/                          # Python FastAPI service
│   ├── auth/                         # Authentication-related modules
│   ├── controllers/                  # Business logic
│   │   ├── security.py               # Password and session security helpers
│   │   └── user.py                   # User and authentication operations
│   ├── models/                       # Pydantic app + database models
│   │   └── user.py                   # User-related data models
│   ├── routes/                       # FastAPI HTTP endpoints
│   │   └── user.py                   # User and authentication routes
│   ├── tests/
│   ├── database.py                   # Asynchronous MongoDB connection
│   └── main.py                       # FastAPI application entry point
├── frontend/                         # Angular and TypeScript application
│   ├── public/                       # Static assets
│   ├── src/                          # Frontend source code
│   │   ├── app/                      # Angular components and configuration
│   │   │   ├── account/              # Account-management interface
│   │   │   ├── api/                  # HTTP clients for the FastAPI backend
│   │   │   ├── auth/                 # Client-side authentication logic
│   │   │   ├── login/                # Login interface
│   │   │   ├── placeholder/          # Reusable placeholder page
│   │   │   │   ├── placeholder.component.css
│   │   │   │   ├── placeholder.component.html
│   │   │   │   └── placeholder.component.ts
│   │   │   ├── signup/               # Account-registration interface
│   │   │   └── types/                # Shared TypeScript types + interfaces
│   │   └── index.html                 # Browser document shell
│   └── tests/                        # Frontend automated tests
├── AGENTS.md                         # Project development guidance
└── README.md                         # Project overview and setup
```

## Installation
