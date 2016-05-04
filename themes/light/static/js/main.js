(function () {
    var messageCookiePrefix = /^gs_cookie_message/;
    var cookieMessage = document.getElementById("gs-cookie-message");
    var cookieMessageClose = document.getElementById("gs-cookie-message-close");
    var cookies = document.cookie.split(/;\s?/)
    var expires = 1000*60*60*24*30; // 30 days

    function closeCookieMessage() {
        var expiresAt = new Date(Date.now() + expires);
        document.cookie = "gs_cookie_message=; expires=" + expiresAt.toUTCString();
        cookieMessage.className = "hidden";
    }

    // Add onclick handler to close button.
    cookieMessageClose.onclick = closeCookieMessage;

    // Check if the cookie exists.
    for (var index = 0; index < cookies.length; index++) {
        var cookie = cookies[index];

        if (messageCookiePrefix.test(cookie)) {
            // Done here.
            return;
        }
    }

    // Display message.
    cookieMessage.className = "";

})();
