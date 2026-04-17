import { Server } from "socket.io";

let connections = {};
let messages = {};
let timeOnline = {};

export const connectToSocket = (server)=>{
    const io = new Server(server,{
        cors:{
            origin: "*",
            methods: ["GET", "POST"],
            allowedHeaders: ["*"],
            credentials: true,
        }
    });


    io.on("connection", (socket)=>{
        socket.on("join-call", (path)=>{

            if (!path || typeof path !== "string") return;

            if (connections[path] === undefined) {
                connections[path] = [];
            }

            // Support unlimited participants (removed 2-person limit)
            connections[path].push(socket.id);
            timeOnline[socket.id] = new Date();

            // Tell the joining user who is already here
            io.to(socket.id).emit(
                "existing-users",
                connections[path].filter((id) => id !== socket.id)
            );

            // Notify everyone else a new user joined
            connections[path]
                .filter((id) => id !== socket.id)
                .forEach((id) => io.to(id).emit("user-joined", socket.id));

        })

        socket.on("signal", (toId, signalData)=>{
            io.to(toId).emit("signal",socket.id, signalData);
        })

        socket.on("chat-message", (data,sender)=>{
            const [matchingRoom, found] = Object.entries(connections).reduce(
                ([room, isFound], [roomKey, roomValue]) => {
                    if (!isFound && Array.isArray(roomValue) && roomValue.includes(socket.id)) {
                        return [roomKey, true];
                    }
                    return [room, isFound];
                },
                ["", false]
            );

            if (!found) return;

            if (messages[matchingRoom] === undefined) {
                messages[matchingRoom] = [];
            }
            messages[matchingRoom].push({
                sender,
                data,
                "socket-id-sender": socket.id,
            });
            console.log("messages", matchingRoom, ":", sender, data);

            connections[matchingRoom].forEach((elem)=>{
                io.to(elem).emit("chat-message",data,sender,socket.id);
            })
        })

        socket.on("disconnect", ()=>{
            const [matchingRoom, found] = Object.entries(connections).reduce(
                ([room, isFound], [roomKey, roomValue]) => {
                    if (!isFound && Array.isArray(roomValue) && roomValue.includes(socket.id)) {
                        return [roomKey, true];
                    }
                    return [room, isFound];
                },
                ["", false]
            );

            delete timeOnline[socket.id];

            if (!found) return;

            // Remove socket from room
            connections[matchingRoom] = connections[matchingRoom].filter((id) => id !== socket.id);

            // Notify remaining participants
            connections[matchingRoom].forEach((id) => {
                io.to(id).emit("user-left", socket.id);
            });

            if (connections[matchingRoom].length === 0) {
                delete connections[matchingRoom];
                delete messages[matchingRoom];
            }
        })
    })

    return io;
}