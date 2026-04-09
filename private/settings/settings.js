// settings.js

let selectedColor = "#ef4444";

function showError(message) {
  $("#bulmaError").text(message).fadeIn();
}

function resetButton($button, originalText) {
  $button.removeClass("is-loading is-danger is-success").addClass("is-link").text(originalText);
}

function updatePreviewColor(hex) {
  $("#profile-preview").css("background-color", hex);
}

function updateInitialsFromUsername(username) {
  const parts = username.trim().split(" ");
  const initials = parts[0][0] + (parts[1] ? parts[1][0] : "");
  $("#preview-initials").text(initials.toUpperCase());
}

$(document).on("click", ".color-circle", function () {
  $(".color-circle").removeClass("selected");
  $(this).addClass("selected");
  const hex = $(this).data("color");
  selectedColor = hex;
  updatePreviewColor(hex);
});

$("#custom-color-picker").on("input", function () {
  const hex = $(this).val();
  $(".color-circle").removeClass("selected");
  selectedColor = hex;
  updatePreviewColor(hex);
});

function regeneratePfp() {
  const username = $("#username-display").text();
  const $button = $("#updateProfileBtn");

  $button.removeClass("is-danger is-success").addClass("is-link is-loading").text("Saving...");

  $.ajax({
    url: "/api/settings/newpfp",
    method: "POST",
    contentType: "application/json",
    data: JSON.stringify({ username, color: selectedColor }),
    success: function () {
      $button.removeClass("is-loading is-link").addClass("is-success").text("Success!");
      $("#profile-image").attr("src", `/uploads/pfps/${username}.png?${Date.now()}`);
      setTimeout(() => resetButton($button, "Update Profile Picture"), 1500);
    },
    error: function () {
      showError("Failed to update profile picture.");
      $button.removeClass("is-loading is-link").addClass("is-danger").text("Try Again");
    }
  });
}

$("#updateProfileBtn").on("click", regeneratePfp);

$("#updateUsernameBtn").on("click", function () {
  const $newUsernameInput = $("#new-username");
  const newUsername = $newUsernameInput.val().trim();
  const $button = $(this);

  $newUsernameInput.removeClass('is-danger is-success');

  if (newUsername === "") {
    showError("New username cannot be empty.");
    $newUsernameInput.addClass('is-danger');
    return;
  }

  if (!/^[a-zA-Z0-9]+$/.test(newUsername)) {
    showError('Username can only contain letters and numbers. No special characters allowed.'); // Updated message
    $newUsernameInput.addClass('is-danger');
    return;
  }

  $button.removeClass("is-danger is-success").addClass("is-link is-loading").text("Saving...");

  $.ajax({
    url: "/api/settings/username",
    method: "POST",
    contentType: "application/json",
    data: JSON.stringify({
      currentUsername: $("#username-display").text(),
      newUsername: newUsername
    }),
    success: function (response) {
      const confirmedUsername = response && response.newUsername ? response.newUsername : newUsername;
      $("#username-display").text(confirmedUsername);
      updateInitialsFromUsername(confirmedUsername);
      $button.removeClass("is-loading is-link").addClass("is-success").text("Success!");
      $newUsernameInput.val('');
      $newUsernameInput.removeClass('is-success is-danger');
      $("#profile-image").attr("src", `/uploads/pfps/${confirmedUsername}.png?${Date.now()}`);
      setTimeout(() => resetButton($button, "Update Username"), 1500);
    },
    error: function (xhr) {
      const errorMsg = xhr.responseJSON?.message || "Failed to update username.";
      showError(errorMsg);
      $newUsernameInput.removeClass('is-success').addClass('is-danger');
      $button.removeClass("is-loading is-link").addClass("is-danger").text("Try Again");
    }
  });
});

$("#updatePasswordBtn").on("click", function () {
  const password = $("#new-password").val().trim();
  const $button = $(this);

  if (password.length < 8) {
    showError("Password must be at least 8 characters.");
    return;
  }

  $button.removeClass("is-danger is-success").addClass("is-link is-loading").text("Saving...");

  $.ajax({
    url: "/api/settings/password",
    method: "POST",
    contentType: "application/json",
    data: JSON.stringify({ password }),
    success: function () {
      $button.removeClass("is-loading is-link").addClass("is-success").text("Success!");
      setTimeout(() => resetButton($button, "Update Password"), 1500);
    },
    error: function () {
      showError("Failed to update password.");
      $button.removeClass("is-loading is-link").addClass("is-danger").text("Try Again");
    }
  });
});

$("#new-username, #new-password").on("input", function () {
  $("#bulmaError").fadeOut();
  $("#updateUsernameBtn, #updatePasswordBtn, #updateProfileBtn").removeClass("is-danger is-success").addClass("is-link");
  $("#updateUsernameBtn").text("Update Username");
  $("#updatePasswordBtn").text("Update Password");
  $("#updateProfileBtn").text("Update Profile Picture");
});

fetch("/api/session")
  .then(res => res.json())
  .then(data => {
    const username = data.username || "Guest";
    $("#username-display").text(username);
    $("#profile-image").attr("src", `/uploads/pfps/${username}.png`);
    updateInitialsFromUsername(username);
  });

const returnButton = $("#return-button");
const lastVisitedFrom = sessionStorage.getItem("lastVisitedFrom");

if (lastVisitedFrom === "home") {
  returnButton.text("←Home").on("click", (e) => {
    e.preventDefault();
    window.location.href = "/home/home.html";
  });
} else if (lastVisitedFrom === "friends") {
  returnButton.text("←Friends").on("click", (e) => {
    e.preventDefault();
    window.location.href = "/friends/friends.html";
  });
} else if (lastVisitedFrom === "globalchat") {
  returnButton.text("←Global Chat").on("click", (e) => {
    e.preventDefault();
    window.location.href = "/globalchat/globalchat.html";
  });
} else if (lastVisitedFrom === "groupchats") {
  returnButton.text("←Group Chats").on("click", (e) => {
    e.preventDefault();
    window.location.href = "/groupchats/groupchats.html";
  });
} else {
  returnButton.text("← Home").on("click", (e) => {
    e.preventDefault();
    window.location.href = "/home/home.html";
  });
}

// Dark mode toggle handler
$("#toggle-theme").on("click", function () {
  $("body").toggleClass("dark-mode");
  const isDark = $("body").hasClass("dark-mode");
  localStorage.setItem("theme", isDark ? "dark" : "light");
  $("#toggle-theme i").toggleClass("fa-moon fa-sun");
});

// Load theme from localStorage on start
$(document).ready(function () {
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    $("body").addClass("dark-mode");
    $("#toggle-theme i").removeClass("fa-moon").addClass("fa-sun");
  }
});

$("#toggle-sidebar").on("click", function () {
  $("#sidebar").toggleClass("is-hidden");
});