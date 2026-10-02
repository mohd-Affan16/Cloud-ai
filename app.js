document.addEventListener("DOMContentLoaded", () => {
    // List of doodle background image URLs
    const doodleBackgrounds = [
        "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1920&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?q=80&w=1920&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=1920&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1920&auto=format&fit=crop"
    ];

    // Select a random doodle background on load
    const randomDoodle = doodleBackgrounds[Math.floor(Math.random() * doodleBackgrounds.length)];
    document.body.style.backgroundImage = url("${randomDoodle}");

    // Handle form submission validation
    const loginForm = document.getElementById("loginForm");
    const message = document.getElementById("message");

    loginForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const username = document.getElementById("username").value.trim();
        const password = document.getElementById("password").value.trim();

        if (username && password) {
            message.style.color = "green";
            message.textContent = "Validation successful! Sign-in requested.";
        } else {
            message.style.color = "red";
            message.textContent = "Please fill in all fields.";
        }
    });
});