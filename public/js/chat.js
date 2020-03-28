const socket = io();

// Elements
const $messageForm = document.querySelector("#msgForm");
const $messageFormInput = $messageForm.querySelector("#messageInput");
const $messageButton = $messageForm.querySelector("#sendMsgBtn");
const $locationButton = document.querySelector("#sendLocBtn");
const $messages = document.querySelector("#messages");

// Templates
const messageTemplate = document.querySelector("#msg-template").innerHTML;
const locationTemplate = document.querySelector("#location-template").innerHTML;
const sidebarTemplate = document.querySelector("#sidebar-template").innerHTML;

// Options
const { username, room } = Qs.parse(location.search, {
    ignoreQueryPrefix: true
});

const autoscroll = () => {
    // New message element
    const $newMessage = $messages.lastElementChild;

    // Height of the new message
    const newMessageStyles = getComputedStyle($newMessage);
    const newMessageMargin = parseInt(newMessageStyles.marginBottom);
    const newMessageHeight = $newMessage.offsetHeight + newMessageMargin;

    // Visible height
    const visibleHeight = $messages.offsetHeight;

    // Height of messages container
    const containerHeight = $messages.scrollHeight;

    // How far are we scrolled
    const scrollOffset = $messages.scrollTop + visibleHeight;

    if (containerHeight - newMessageHeight <= scrollOffset) {
        $messages.scrollTop = $messages.scrollHeight;
    }
};

socket.on("message", message => {
    console.log(message);
    const html = Mustache.render(messageTemplate, {
        username: message.username,
        message: message.text,
        createdAt: moment(message.createdAt).format("H:MM")
    });
    $messages.insertAdjacentHTML("beforeend", html);
    autoscroll();
});

socket.on("locationMessage", message => {
    console.log(message);
    const html = Mustache.render(locationTemplate, {
        username: message.username,
        link: message.url,
        createdAt: moment(message.createdAt).format("H:MM")
    });
    $messages.insertAdjacentHTML("beforeend", html);
    autoscroll();
});

socket.on("roomData", ({ room, users }) => {
    const html = Mustache.render(sidebarTemplate, {
        room,
        users
    });
    document.querySelector("#sidebar").innerHTML = html;
});

$messageButton.addEventListener("click", e => {
    e.preventDefault();

    $messageButton.setAttribute("disabled", "disabled");

    const message = $messageFormInput.value;

    socket.emit("sentMessage", message, error => {
        $messageButton.removeAttribute("disabled");
        $messageFormInput.value = "";
        $messageFormInput.focus();

        if (error) {
            return console.log("message from server:", error);
        }

        console.log("message delivered");
    });
});

$locationButton.addEventListener("click", () => {
    if (!navigator.geolocation) {
        return alert("no geolocation");
    }

    $locationButton.setAttribute("disabled", "disabled");

    navigator.geolocation.getCurrentPosition(position => {
        socket.emit(
            "sentLocation",
            {
                lat: position.coords.latitude,
                long: position.coords.longitude
            },
            error => {
                if (error) {
                    return console.log("message from server:", error);
                }
                $locationButton.removeAttribute("disabled");
                console.log("location delivered");
            }
        );
    });
});

socket.emit("join", { username, room }, error => {
    if (error) {
        alert(error);
        location.href = "/";
    }
});
