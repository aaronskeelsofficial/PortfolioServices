module.exports.init = function (io) {
    let roomstates = {};
    io.on('connection', (socket) => {
        socket.on('diffiehellmanchat-roomcheck', (data) => {
            if(roomstates[data] == null){
                socket.emit("diffiehellmanchat-roomcheckres", "empty");
                socket.join("diffiehellmanchat-room-" + data);
                roomstates[data] = 0;
            }else{
                if(roomstates[data] == 0) {
                    socket.emit("diffiehellmanchat-roomcheckres", "waiting");
                    socket.join("diffiehellmanchat-room-" + data);
                    roomstates[data] = 1;
                }else{
                    socket.emit("diffiehellmanchat-roomcheckres", "full");
                }
            }
        });
        socket.on('diffiehellmanchat-startroom', (data) => {
            io.to("diffiehellmanchat-room-" + data).emit("startkeytrade");
        });
        socket.on("diffiehellmanchat-pubkeya", (data) => {
            let roomcode = data.substring(0, data.indexOf(":"));
            console.log("Server received pubkeya");
            io.to("diffiehellmanchat-room-" + roomcode).emit("diffiehellmanchat-pubkeya", data);
        });
        socket.on("diffiehellmanchat-pubkeyb", (data) => {
            let roomcode = data.substring(0, data.indexOf(":"));
            io.to("diffiehellmanchat-room-" + roomcode).emit("diffiehellmanchat-pubkeyb", data);
        });
        socket.on("diffiehellmanchat-role0message", (data) => {
            let roomcode = data.substring(0, data.indexOf(":"));
            let message = data.replace(roomcode + ":", ""); //Maybe move this computation to client side at some point
            io.to("diffiehellmanchat-room-" + roomcode).emit("diffiehellmanchat-role0message", message);
        });
        socket.on("diffiehellmanchat-role1message", (data) => {
            let roomcode = data.substring(0, data.indexOf(":"));
            let message = data.replace(roomcode + ":", ""); //Maybe move this computation to client side at some point
            io.to("diffiehellmanchat-room-" + roomcode).emit("diffiehellmanchat-role1message", message);
        });
    });
}