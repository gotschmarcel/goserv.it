+++
date = "2016-05-03T12:14:12+02:00"
title = "File Server"
keywords = ["static", "file server"]

[menu.main]
    parent = "getting_started"
    name = "File Server"
    weight = 20
+++

Often it is necessary to serve static content along with dynamic content. Fortunately, the standard library already
provides a simple function to create a [file server](https://golang.org/pkg/net/http/#FileServer).
Due to the compatibility of *goserv* to the standard library you can use it as is:

{{< highlight go >}}
import (
    "log"
    "net/http"
    "github.com/gotschmarcel/goserv"
)

func main(w http.ResponseWriter, r *http.Request) {
    server := goserv.NewServer()

    server.Use(http.FileServer(http.Dir("/usr/share/doc")))

    log.Fatalln(server.Listen(":12345"))
}
{{< /highlight >}}

To serve files under a certain prefix we need to strip the prefix from the request path before
passing it to the file server. Luckily the standard library provides a helper for that also:

{{< highlight go >}}
import (
    "log"
    "net/http"
    "github.com/gotschmarcel/goserv"
)
func main(w http.ResponseWriter, r *http.Request) {
    server := goserv.NewServer()

    fileServer := http.FileServer(http.Dir("/usr/share/doc"))
    server.All("/public/*", http.StripPrefix("/public/", fileServer))

    log.Fatalln(server.Listen(":12345"))
}
{{< /highlight >}}
