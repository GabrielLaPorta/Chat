const express = require("express");
const path = require("path");

const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server);
var randomId = require("random-id");

app.use(express.static(path.join(__dirname, "public")));

app.set("views", path.join(__dirname, "public"));
app.engine("html", require("ejs").renderFile);
app.set("view engine", "html");

app.use("/", (req, res) => {
  res.render("index.html");
});

let users = [];

io.use((socket, next) => {
  const socketId = socket.handshake.query.id;
  const username = socket.handshake.query.username;
  if (socketId) {
    // find existing session
    const user = users.find((u) => u.id === socketId);
    if (user) {
      users = users.map((u) => {
        if (u.id === user.id) {
          u.id = socket.id;
          return u;
        } else {
          return u;
        }
      });
      socket.username = user.username;

      socket.emit("logged", { username: username, id: socket.id });

      return next();
    } else {
      const connectUser = {
        username: username,
        id: socket.id,
        rooms: [],
      };
      users.push(connectUser);
      socket.emit("logged", connectUser);
      return next();
    }
  }
  next();
});

io.on("connection", (socket) => {
  console.log("Socket conectado: ", socket.id);
  /* 
  socket.emit("receiveId", socket.id); */
  socket.broadcast.emit("active-users", users);
  socket.emit("active-users", users);

  socket.on("sendMessage", (data) => {
    messages.push(data);
    socket.broadcast.emit("receivedMessage", data);
  });

  socket.on("login", (data) => {
    const user = {
      username: data.username,
      id: socket.id,
      rooms: [],
    };
    if (!users.some((u) => u.username === data.username)) {
      users.push(user);
      socket.emit("logged", user);
      socket.broadcast.emit("active-users", users);
    }
  });

  socket.on("create-room", (usersIds) => {
    let roomName = "";
    for (const id in usersIds) {
      for (const u in users) {
        if (users[u].id === usersIds[id]) {
          roomName =
            roomName +
            users[u].username +
            (id == usersIds.length - 1 ? "" : " - ");
        }
      }
    }
    const room = {
      id: randomId(30, "aA0"),
      name: roomName,
      messages: [],
    };
    for (const id in usersIds) {
      for (const u in users) {
        if (users[u].id === usersIds[id]) {
          users[u].rooms.push(room);
          socket.to(usersIds[id]).emit("new-room", room);
        }
      }
    }
    socket.emit("new-room", room);
  });

  socket.on("join-room", (roomId) => {
    socket.join(roomId);
  });

  socket.on("send-message", (data) => {
    const { roomId, message } = data;
    for (const u in users) {
      if (users[u].id === socket.username) {
        users[u].rooms;
        for (const r in users[u].rooms) {
          if (users[u].rooms[r].id === roomId) {
            users[u].rooms[r].messages.push(message);
          }
        }
      }
    }
    io.to(roomId).emit("new-message", data);
  });
});

server.listen(process.env.PORT || 5000, () =>
  console.log(`servidor rodando na porta ${process.env.PORT || 5000}`)
);
