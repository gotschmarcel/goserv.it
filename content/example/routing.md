+++
date = "2016-05-03T16:03:55+02:00"
keywords = ["routing", "router", "route"]
title = "Routing"

[menu.main]
    parent = "getting_started"
    name = "Routing"
    weight = 0
+++

The most important feature of *goserv* is routing. Since learning by doing is the easiest way to get
started, lets jump right into it :).

First of all every *goserv* server starts with a single instance of
[`Server`](https://godoc.org/github.com/gotschmarcel/goserv#Server):

{{< highlight go >}}
import (
    "log"
    "net/http"
    "github.com/gotschmarcel/goserv"
)

func main(w http.ResponseWriter, r *http.Request) {
    server := goserv.NewServer()

    ...

    log.Fatalln(server.Listen(":12345"))
}
{{< /highlight >}}

This is the minimal code you'll need to get a server up and running. Now lets add a simple
route for our index page:

{{< highlight go >}}
server.Get("/", IndexHandler)
{{< /highlight >}}

> All handler implementations are omitted to keeps things focussed on routing

Each `Router` as well as the `Server` (which is a special router) provides methods to register
handlers for routes. One important thing to notice here is the use of one of the methods named after
a HTTP verb. This means the only requests having the HTTP method "GET" and a URL path that matches
exactly "/" will be forwarded to our `IndexHandler`.

> *goserv* provides a convenience method for the most common HTTP verbs: GET, PUT, POST, DELETE and PATCH

You can get the same result by using the `.Method(method, path, handler)` method:

{{< highlight go >}}
server.Method("GET", "/", IndexHandler)
{{< /highlight >}}

If you want a handler to be called for multiple or even all methods you can use `.Methods(methods, path, handler)` and
`.All(path, handler)`. Sometimes a single route has different handlers for each method. You could do it like this:

{{< highlight go >}}
server.Get("/longpath", GetLongPath)
server.Put("/longpath", PutLongPath)
server.Post("/longpath", PostLongPath)
{{< /highlight >}}

but there's a more elegant version using `.Route(path)`:

{{< highlight go >}}
route := server.Route("/longpath")
route.Get(GetLongPath).Put(PutLongPath).Post(PostLongPath)
{{< /highlight >}}

> Noticed the method chaining? All `Router` and `Route` instances allow this.
> The are two exceptions though:
>
>   * `Router.SubRouter` returns a new `Router`
>   * `Router.Router` returns a new `Route` not the router itself

If you want to use a handler for all methods that currently have none, use the `.Rest` method:

{{< highlight go >}}
server.Route("/articles").Get(GetArticles).Rest(NotImplemented)
{{< /highlight >}}

Often there are handlers that handle all requests, so called middleware. To register a handler
as middleware use `.Use(handler)`:

{{< highlight go >}}
server.Use(authentication)
{{< /highlight >}}

If you want a middleware to handle all request beginning with e.g. *"/api"* you can use `.SubRouter(prefix)`
to create a new sub router and then set the middleware there:

{{< highlight go >}}
api := server.SubRouter("/api")
api.Use(authentication)
{{< /highlight >}}

## Order Matters

One important thing to notice is that the order in which the routes, middleware and sub routers
are registered does matter. The server passes the requests to the matching handlers in the same
order. This means that it is possible to process a request in a middleware which follows a normal
route, but only if the route didn't write a response:

{{< highlight go >}}
server.Get("/", DoingNothing)
server.Use(CalledAfterHandler)
{{< /highlight >}}

## Strict Slash vs Non-Strict Slash

All routers can be configured to be either strict or non-strict with trailing slashes. By default
all routers are non-strict. Sub routers inherit the parents behavior.

A route `/mypath` created on a non-strict router will match both `/mypath` and `/mypath/`. While the
same route created on a strict router will consider both paths to be different.

## Path Syntax

All routes are registered under a certain path. A path in *goserv* is not just a simple string instead
it is a small language inspired by regular expressions. Lets dive into it!

### Wildcards

Wildcards allow you to create routes matching more than a single exact path, e.g. matching
only a certain prefix. The number of wildcards and the position is not restricted.

{{< highlight go >}}
server.Get("/public*", PublicHandler)
server.Get("/a/*/c", MyHandler)
{{< /highlight >}}

### Optionals

Optionals allow you to specify optional characters or character groups.

{{< highlight go >}}
server.Get("/articles?", ArticleHandler)                // Matches /article and /articles
server.Get("/api/(public)?/articles", ArticleHandler)   // Matches /api/articles and /api/public/articles
{{< /highlight >}}

### Parameters

Parameters allow you to capture parts of the URL which are then accessible through `RequestContext.Param`.
Additionally you can register parameter handlers on a `Router` using `.Param(name, handler)` to preprocess
the captured values.

> The parameter names should be unique otherwise they may overwrite each other!

{{< highlight go >}}
server.Get("/articles/:article_id", GetArticle)
server.Param("article_id", func (w http.ResponseWriter, r *http.Request, id string) {
    // Validate ID
})
{{< /highlight >}}
