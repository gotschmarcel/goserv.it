+++
date = "2016-05-03T12:11:16+02:00"
title = "RequestContext: Share Data, Access URL Parameters and Handle Errors"
keywords = ["context"]

[menu.main]
    parent = "getting_started"
    name = "Request Context"
    weight = 5
+++

In *goserv* every request has its own context. This context called `RequestContext` allows you
to share data between handlers, access captured URL parameters (depending on the current route) and
lets you pass errors to the next error handler.

To access a request's context simply pass the request to `goserv.Context(r)`:

{{< highlight go >}}
func MyHandler(w http.ResponseWriter, r *http.Request) {
    context := goserv.Context(r)
}
{{< /highlight >}}

To share data between multiple handlers you can use the context's `.Set` and `.Get` methods. There
are even more convenience methods, check them out at the reference  [documentation](https://godoc.org/github.com/gotschmarcel/goserv#RequestContext):

{{< highlight go >}}
func MyMiddleware(w http.ResponseWriter, r *http.Request) {
    context := goserv.Context(r)
    context.Set("shared", "data")
}

func MyHandler(w http.ResponseWriter, r *http.Request) {
    context := goserv.Context(r)

    // .Get returns the interface{} type.
    // Use type assertions to get the original type.
    value := context.Get("shared").(string)

    goserv.WriteStringf(w, "Received %q", value)
}
{{< /highlight >}}

RequestContext lets you store arbitrary types thus it is necessary to cast the type back to its
original type using *type assertions*.

Sometimes routes are set up to capture certain parts of the URL path, these parts are called parameters.
Each parameter has a name with which you can access the captured part by passing it to `.Param(name)`:

{{< highlight go >}}
func MyHandler(w http.ResponseWriter, r *http.Request) {
    param := goserv.Context(r).Param("my_param")
}
{{< /highlight >}}

The last important feature is error handling. Calling `.Error(err, code)` on the context
tells goserv to stop processing as soon as the current handler returns. The error along with the
code will be passed to the next error handler as [`ContextError`](https://godoc.org/github.com/gotschmarcel/goserv#ContextError).
The code is usually in the range of 4xx or 5xx and is used by the [`StdErrorHandler`](https://godoc.org/github.com/gotschmarcel/goserv#pkg-variables) as response status.
