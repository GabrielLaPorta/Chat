const id = localStorage.getItem("socket");
const socket = io(
  "https://chat-do-gabriel.herokuapp.com/" || "http://localhost:5000",
  {
    query: {
      id: id ? id : "",
      username: localStorage.getItem("username"),
    },
  }
);

onInit();

socket.on("logged", (data) => {
  localStorage.setItem("socket", data.id);
  localStorage.setItem("username", data.username);
  onInit();
});

socket.on("receiveId", (id) => {
  localStorage.setItem("socket", id);
});

socket.on("new-room", (room) => {
  joinRoom(room);
  let rooms = localStorage.getItem("rooms");

  if (rooms) {
    rooms = JSON.parse(rooms);
    rooms.push(room);
    localStorage.setItem("rooms", JSON.stringify(rooms));
  } else {
    localStorage.setItem("rooms", JSON.stringify([room]));
  }
  renderRoom(room);
});

socket.on("new-message", ({ roomId, message }) => {
  let rooms = localStorage.getItem("rooms");
  if (rooms) {
    rooms = JSON.parse(rooms);
    const dataRooms = rooms.map((r) => {
      if (r.id === roomId) {
        r.messages.push(message);
        return r;
      } else {
        return r;
      }
    });
    localStorage.setItem("rooms", JSON.stringify(dataRooms));
    renderMessage({ roomId, message });
  }
});

$("#user").submit((event) => {
  event.preventDefault();
  let username = $("input[name=username]").val();

  if (username.length) {
    socket.emit("login", { username: username });
  }
});

$("#room").submit((event) => {
  event.preventDefault();
  let users = $("#users").val();
  users.push(localStorage.getItem("socket"));
  socket.emit("create-room", users);
});

$("#message").submit((event) => {
  event.preventDefault();
  const textValue = $("#text-message").val();
  const roomId = $(".active-chat").attr("data-chat");
  const rooms = localStorage.getItem("rooms");
  const message = {
    sender: localStorage.getItem("username"),
    text: textValue,
  };

  if (rooms && roomId) {
    socket.emit("send-message", { roomId: roomId, message: message });
    $("#text-message").val("");
  } else {
    alert("falha ao enviar mensagem");
  }
});

$("#sair").click(function () {
  socket.emit("exit", localStorage.getItem("username"));
  localStorage.clear();
  document.location.reload();
});

function onInit() {
  if (localStorage.getItem("username")) {
    $("#my-username").empty();
    $("#my-username").append(
      `<strong>${localStorage.getItem("username")}</strong>`
    );
    $(".container-form ").removeClass("display-block").addClass("display-none");
    $(".container").removeClass("display-none").addClass("display-block");
    $(".right .top").removeClass("display-block").addClass("display-none");
    $(".right .write").removeClass("display-block").addClass("display-none");
    $("#sair").removeClass("display-none").addClass("display-block");
    let rooms = localStorage.getItem("rooms");
    if (rooms) {
      rooms = JSON.parse(rooms);
      $(".people").empty();
      $.each(rooms, function (i, item) {
        renderRoom(item);
        renderMessages(item);
      });
      setEvents();
    }
  } else {
    $(".container-form").removeClass("display-none").addClass("display-block");
    $(".container").removeClass("display-block").addClass("display-none");
    $("#sair").removeClass("display-block").addClass("display-none");
  }
}
function setEvents() {
  $(".person").click(function () {
    if ($(this).hasClass(".active")) {
      return false;
    } else {
      var findChat = $(this).attr("data-chat");
      var personName = $(this).find(".name").text();
      joinRoom({ id: findChat });
      $(".right .top .name").html(personName);
      $(".chat").removeClass("active-chat");
      $(".left .person").removeClass("active");
      $(this).addClass("active");
      $(".right .top").removeClass("display-none").addClass("display-block");
      $(".right .write").removeClass("display-none").addClass("display-block");
      $(".chat[data-chat = " + findChat + "]").addClass("active-chat");
      $(".active-chat").animate(
        { scrollTop: $(".active-chat")[0].scrollHeight },
        100
      );
    }
  });
}

function renderRoom(room) {
  $(".people").append(`
    <li class="person" id="room" data-chat="${room.id}">
      <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" fill="currentColor" class="bi bi-person-circle" viewBox="0 0 16 16">
          <path d="M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/>
          <path fill-rule="evenodd" d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm8-7a7 7 0 0 0-5.468 11.37C3.242 11.226 4.805 10 8 10s4.757 1.225 5.468 2.37A7 7 0 0 0 8 1z"/>
      </svg>
      <span class="name">${room.name}</span>
      <span class="time">2:09 PM</span>
      <span class="preview">${
        room.messages.length > 0 ? room.messages[0].text : ""
      }...</span>
    </li>
  `);
  $(".right .chat-body").empty();
  $(".right .chat-body").append(`
    <div class="chat" data-chat="${room.id}"></div>
  `);

  setEvents();
}
function renderMessages(room) {
  const username = localStorage.getItem("username");
  $.each(room.messages, function (i, message) {
    if (message) {
      message.sender === username
        ? $(".chat[data-chat = " + room.id + "]").append(`
        <div class="bubble me">
            ${message.text}
        </div>
      `)
        : $(".chat[data-chat = " + room.id + "]").append(`
        <div class="bubble you">
          ${message.text}
        </div>
      `);
    }
  });
}

function renderMessage({ roomId, message }) {
  const username = localStorage.getItem("username");

  message.sender === username
    ? $(".chat[data-chat = " + roomId + "]").append(`
    <div class="bubble me">
        ${message.text}
    </div>
  `)
    : $(".chat[data-chat = " + roomId + "]").append(`
    <div class="bubble you">
      ${message.text}
    </div>
  `);
}

function joinRoom(room) {
  socket.emit("join-room", room.id);
}

socket.on("active-users", (users) => {
  $("#users").find("option").remove();
  $.each(users, function (i, item) {
    if (item.username !== localStorage.getItem("username")) {
      $("#users").append(
        $("<option>", {
          value: item.id,
          text: item.username,
        })
      );
    }
  });
});
