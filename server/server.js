const path = require('path');
const http = require('http');
const express = require('express');
const socketIO = require('socket.io');

const {generateMessage, generateLocationMessage} = require('./utils/message');
const {isRealString} = require('./utils/isRealString');
const {Room} = require('./utils/rooms');

const publicPath = path.join(__dirname, '/../public');
const port = process.env.PORT || 3000
let app = express();
let server = http.createServer(app);
let io = socketIO(server);
let rooms = new Room();

app.use(express.static(publicPath));

io.on('connection', (socket) => {
  console.log("A new user just connected");

  socket.on('join', (params, callback) => {
    if(!isRealString(params.name) || !isRealString(params.room)){
      return callback('Name and room are required');
    }

    socket.join(params.room);
    rooms.removeUser(socket.id);
    rooms.addUser(socket.id, params.name, params.room);

    io.to(params.room).emit('updateUsersList', rooms.getUserList(params.room));
    socket.emit('newMessage', generateMessage('Admin', `Welocome to ${params.room}!`));

    socket.broadcast.to(params.room).emit('newMessage', generateMessage('Admin', `User ${params.name} joined!`));

    callback();
  })

  socket.on('createMessage', (message, callback) => {
    let user = rooms.getUser(socket.id);

    if(user && isRealString(message.text)){
        io.to(user.room).emit('newMessage', generateMessage(user.name, message.text));
    }
    callback('This is the server:');
  });

  socket.on('disconnect', () => {
    let user = rooms.removeUser(socket.id);

    if(user){
      io.to(user.room).emit('updateUsersList', rooms.getUserList(user.room));
      io.to(user.room).emit('newMessage', generateMessage('Admin', `${user.name} has left ${user.room} chat room.`))
    }
  });
});

server.listen(port, ()=>{
  console.log(`Server is up on port ${port}`);
})
