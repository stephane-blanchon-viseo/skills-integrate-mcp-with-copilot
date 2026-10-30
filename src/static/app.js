document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const emailInput = document.getElementById("email");
  const messageDiv = document.getElementById("message");
  const userIcon = document.getElementById("user-icon");
  const loginModal = document.getElementById("login-modal");
  const closeBtn = document.querySelector(".close-btn");
  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const loginError = document.getElementById("login-error");

  let isAdmin = false;

  // Modal event listeners
  userIcon.addEventListener("click", () => {
    loginModal.classList.remove("hidden");
    usernameInput.focus();
  });

  closeBtn.addEventListener("click", () => {
    loginModal.classList.add("hidden");
    usernameInput.value = "";
    passwordInput.value = "";
    loginError.classList.add("hidden");
  });

  window.addEventListener("click", (event) => {
    if (event.target === loginModal) {
      loginModal.classList.add("hidden");
    }
  });

  // Login handler
  loginBtn.addEventListener("click", async () => {
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    if (!username || !password) {
      showLoginError("Please enter both username and password");
      return;
    }

    try {
      const response = await fetch("/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        isAdmin = true;
        updateAdminUI();
        loginModal.classList.add("hidden");
        usernameInput.value = "";
        passwordInput.value = "";
        loginError.classList.add("hidden");
        showMessage("Login successful!", "success");
      } else {
        showLoginError("Invalid username or password");
      }
    } catch (error) {
      showLoginError("Login failed. Please try again.");
      console.error("Error logging in:", error);
    }
  });

  // Logout handler
  logoutBtn.addEventListener("click", () => {
    isAdmin = false;
    updateAdminUI();
    loginModal.classList.add("hidden");
    usernameInput.value = "";
    passwordInput.value = "";
    loginError.classList.add("hidden");
    showMessage("Logged out successfully", "success");
  });

  // Allow Enter key to submit login
  usernameInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") loginBtn.click();
  });

  passwordInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") loginBtn.click();
  });

  function showLoginError(message) {
    loginError.textContent = message;
    loginError.classList.remove("hidden");
  }

  function updateAdminUI() {
    if (isAdmin) {
      loginBtn.classList.add("hidden");
      logoutBtn.classList.remove("hidden");
      userIcon.textContent = "👨‍🏫";
      emailInput.parentElement.classList.add("hidden");
    } else {
      loginBtn.classList.remove("hidden");
      logoutBtn.classList.add("hidden");
      userIcon.textContent = "👤";
      emailInput.parentElement.classList.remove("hidden");
    }
    fetchActivities();
  }

  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");
    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons instead of bullet points
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants (${details.participants.length}/${details.max_participants}):</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span>${
                        isAdmin
                          ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button>`
                          : ""
                      }</li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        const registerButtonHTML = isAdmin
          ? `<button class="register-btn" data-activity="${name}">Register Student</button>`
          : `<p class="view-only-notice">Students cannot register. Contact a teacher.</p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="activity-actions">
            ${registerButtonHTML}
          </div>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);
      });

      // Add event listeners to register buttons (only if admin)
      if (isAdmin) {
        document.querySelectorAll(".register-btn").forEach((button) => {
          button.addEventListener("click", handleRegister);
        });

        // Add event listeners to delete buttons
        document.querySelectorAll(".delete-btn").forEach((button) => {
          button.addEventListener("click", handleUnregister);
        });
      }
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle register functionality
  async function handleRegister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = emailInput.value.trim();

    if (!email && isAdmin) {
      showMessage("Please enter a student email first", "error");
      return;
    }

    if (!isAdmin) {
      showMessage("Only teachers can register students", "error");
      return;
    }

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}&is_admin=true`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to register. Please try again.", "error");
      console.error("Error registering:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    if (!isAdmin) {
      showMessage("Only teachers can unregister students", "error");
      return;
    }

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}&is_admin=true`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  // Initialize app
  updateAdminUI();
});
