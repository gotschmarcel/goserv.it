(function () {
    var cookiePrefix = "gs_cookie_message";
    var cookieMessage = document.getElementById("gs-cookie-message");
    var cookieMessageClose = document.getElementById("gs-cookie-message-close");
    var cookies = document.cookie.split(/;\s?/)
    var expires = 1000*60*60*24*30; // 30 days

    function closeCookieMessage() {
        var expiresAt = new Date(Date.now() + expires);

        // Set message cookie
        document.cookie = [
            cookiePrefix + "=",
            "expires=" + expiresAt.toUTCString(),
            "path=/"
        ].join("; ");

        cookieMessage.className = "hidden";
    }

    // Add onclick handler to close button.
    cookieMessageClose.onclick = closeCookieMessage;

    // Check if the cookie exists.
    if (document.cookie.indexOf(cookiePrefix) !== -1) {
        return;
    }

    // Display message.
    cookieMessage.className = "";

})();
