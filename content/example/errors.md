+++
date = "2016-05-03T12:19:41+02:00"
keywords = ["error handling"]
title = "Error Handling"

[menu.main]
    parent = "getting_started"
    name = "Error Handling"
    weight = 10
+++

One of the cool features of *goserv* is centralized error handling. You can easily pass errors
occurred in a handler to the next error handler along with a response status code:

{{< highlight go >}}
func MyHandler(w http.ResponseWriter, r *http.Request) {
    if err := someAction(); err != nil {
        goserv.Context(r).Error(err, 500)
        return
    }
}
{{< /highlight >}}

goserv stops processing as soon as the handler setting the error returns and passes the
[`ContextError`](https://godoc.org/github.com/gotschmarcel/goserv#ContextError) to the next error handler.
By default this is always the [standard error handler](https://godoc.org/github.com/gotschmarcel/goserv#pkg-variables)
of the [`Server`](https://godoc.org/github.com/gotschmarcel/goserv#Server).

If you want your own custom error handler you can easily overwrite the default error handler:

{{< highlight go >}}
import (
    "log"
    "net/http"
    "github.com/gotschmarcel/goserv"
)

func main(w http.ResponseWriter, r *http.Request) {
    server := goserv.NewServer()

    server.ErrorHandler = func (w http.ResponseWriter, r *http.Request, err *goserv.ContextError) {
        log.Printf("Error: ", err)

        w.WriteHeader(err.Code)
        goserv.WriteString(err.String())
    }

    log.Fatalln(server.Listen(":12345"))
}
{{< /highlight >}}

Sometimes it is necessary to have error handlers which have a smaller scope and act only on certain routes.
Just create a sub router by calling `.SubRouter(prefix)` on the `Server` and assign a custom error handler to the `.ErrorHandler` field:

{{< highlight go >}}
import (
    "log"
    "net/http"
    "github.com/gotschmarcel/goserv"
)

func main(w http.ResponseWriter, r *http.Request) {
    server := goserv.NewServer()

    api := server.SubRouter("/api")
    api.ErrorHandler = func (w http.ResponseWriter, r *http.Request, err *goserv.ContextError) {
        log.Printf("API Error: ", err)

        w.WriteHeader(err.Code)
        goserv.WriteString(err.String())
    }

    log.Fatalln(server.Listen(":12345"))
}
{{< /highlight >}}

You can also let the error handler be passed to the next parent error handler by not writing a
response:

{{< highlight go >}}
api.ErrorHandler = func (w http.ResponseWriter, r *http.Request, err *goserv.ContextError) {
    log.Printf("API Error: ", err)

    // Do not write a response to pass the error to the next error handler.
}
{{< /highlight >}}

A special kind of error in *Go* is an error caused by a call to `panic` which usually terminates the
program. For servers it is sometimes necessary to overcome these errors and not to terminate.
You can configure a [`Router`](https://godoc.org/github.com/gotschmarcel/goserv#Router) to recover
from panics by setting the `.PanicRecovery` field to `true`. Values captured from a panic are passed
to the router's error handler. In case that a router has no error handler the error is simply ignored.

{{< highlight go >}}
import (
    "log"
    "net/http"
    "github.com/gotschmarcel/goserv"
)

func main(w http.ResponseWriter, r *http.Request) {
    server := goserv.NewServer()

    server.PanicRecovery = true

    log.Fatalln(server.Listen(":12345"))
}
{{< /highlight >}}
