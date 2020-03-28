const path = require("path");
const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const Filter = require("bad-words");
const {
    addUser,
    removeUser,
    getUser,
    getUsersInRoom
} = require("./utils/users");

const {
    generateMessage,
    generateLocationMessage
} = require("./utils/messages");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const port = process.env.PORT || 3000;
const publicDirPath = path.join(__dirname, "../public");

app.use(express.static(publicDirPath)); //serve the html files

io.on("connection", socket => {
    socket.on("join", ({ username, room }, callback) => {
        const { error, user } = addUser({ id: socket.id, username, room });

        if (error) {
            return callback(error);
        }

        socket.join(user.room); // virtual rooms for sockets

        socket.emit("message", generateMessage("Admin", "Welcome!"));
        socket.broadcast
            .to(user.room)
            .emit(
                "message",
                generateMessage("Admin", `${user.username} joined`)
            );

        io.to(user.room).emit("roomData", {
            room: user.room,
            users: getUsersInRoom(user.room)
        });

        callback();
    });

    socket.on("sentMessage", (message, callback) => {
        const user = getUser(socket.id);
        const filter = new Filter();

        if (filter.isProfane(message)) {
            return callback("talk nicely!");
        }

        io.to(user.room).emit(
            "message",
            generateMessage(user.username, message)
        );
        callback();
    });

    socket.on("sentLocation", ({ lat, long }, callback) => {
        const user = getUser(socket.id);
        io.to(user.room).emit(
            "locationMessage",
            generateLocationMessage(
                user.username,
                `https://google.com/maps?q${lat},${long}`
            )
        );
        callback();
    });

    socket.on("disconnect", () => {
        const user = removeUser(socket.id);

        if (user) {
            io.to(user.room).emit(
                "message",
                generateMessage("Admin", `${user.username} has left`)
            );
            io.to(user.room).emit("roomData", {
                room: user.room,
                users: getUsersInRoom(user.room)
            });
        }
    });
});

server.listen(3000, () => {
    console.log(`Server is up on ${port}`);
});
