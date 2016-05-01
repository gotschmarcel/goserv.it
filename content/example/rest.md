+++
date = "2016-04-28T18:51:39+02:00"
title = "REST Server with MongoDB"
keywords = ["rest", "api"]

[menu.main]
    parent = "getting_started"
    name = "REST & MongoDB"
+++

This example shows how a simple REST API server is build using *goserv* and [*mgo v2*](https://labix.org/mgo) (MongoDB).
The goal is to create a server to retrieve, create or delete todos by providing a REST API and using
MongoDB as storage backend.

> To keep it simple all code is included in the **main.go** file

Let's start in the `main` function of our **main.go** and add the basic code to start a server:

{{< highlight go >}}
package main

import (
    "fmt"
    "log"
    "net/http"
    "gopkg.in/mgo.v2"
    "gopkg.in/mgo.v2/bson"
    "github.com/gotschmarcel/goserv"
)

func main() {
    server := goserv.NewServer()

    // ...

    log.Fatalln(server.Listen(":12345"))
}
{{< /highlight >}}

Now we can start our server from the console with `$ go run main.go`. Next we need to define our
`Todo` type:

{{< highlight go >}}
type Todo struct {
    ID bson.ObjectId `json:"id" bson:"_id,omitempty"`
    Title string `json:"title"`
    Completed bool `json:"completed"`
}
{{< /highlight >}}

> For more information about the json annotations take a look [here](https://golang.org/pkg/encoding/json/)

The next thing we need is a controller providing handler functions for the API. Additionally the
controller needs a `mgo.Collection` which let's us interact with MongoDB.

{{< highlight go >}}
type Controller struct {
    todos *mgo.Collection
}
{{< /highlight >}}

To get the collection we need to open a new `mgo.Session`. Using the session we can access the database
and its collection by name. Finally we create a controller and pass the collection to it:

{{< highlight go >}}
mongo, err := mgo.Dial("mongodb://localhost:27017")
if err != nil {
    log.Fatalln(err)
}

// Don't forget to cleanup the session
defer mongo.Close()

// Create a new Controller with the "todos" collection
controller := &Controller{mongo.DB("goserv_rest").C("todos")}
{{< /highlight >}}

Since we're now ready to interact with MongoDB it's time to write some route handlers for our
API. Let's start with the simplest one - requesting all todos from our database:

{{< highlight go >}}
func (c *Controller) GetTodos(w http.ResponseWriter, r *http.Request) {
    todos := make([]*Todo, 0)

    if err := c.todos.Find(nil).All(&todos); err != nil {
        goserv.Context(r).Error(err, http.StatusInternalServerError)
        return
    }

    if err := goserv.WriteJSON(w, &todos); err != nil {
        goserv.Context(r).Error(err, http.StatusInternalServerError)
    }

}
{{< /highlight >}}

Here makes it *goserv* easy for us by providing `WriteJSON` which automatically encodes the passed
values into JSON and sets the *Content-Type* to `application/json`. To retrieve only a single todo
by its ID we make use of URL parameters `/todos/:todo_id`. The parameter is extracted by goserv
and can be retrieved from the request context `Context(r).Param("todo_id")`:

{{< highlight go >}}
func (c *Controller) GetTodo(w http.ResponseWriter, r *http.Request) {
    ctx := goserv.Context(r)
    hexID := ctx.Param("todo_id")
    objectID := bson.ObjectIdHex(hexID)
    todo := &Todo{}

    // Query the todo from MongoDB
    if err := c.todos.FindId(objectID).One(todo); err != nil {
        code := http.StatusInternalServerError

        // Todo not found
        if err == mgo.ErrNotFound {
            err = fmt.Errorf("no such todo: %s", hexID)
            code = http.StatusNotFound
        }

        ctx.Error(err, code)
        return
    }

    // Pass todo to next handler
    if err := goserv.WriteJSON(w, todo); err != nil {
        ctx.Error(err, http.StatusInternalServerError)
        return
    }
}
{{< /highlight >}}

To make sure that we always get a valid ObjectID in our handlers we make use of goserv's parameter handlers.
The parameter handler gets invoked once before the handlers are processed.

{{< highlight go >}}
func (c *Controller) TodoID(w http.ResponseWriter, r *http.Request, id string) {
    // Validate that the URL parameter is a valid Object ID representation
    if bson.IsObjectIdHex(id) {
        return
    }

    goserv.Context(r).Error(fmt.Errorf("invalid id: %s", id), http.StatusBadRequest)
}
{{< /highlight >}}

Now we're able to query all of our todos or only a single todo. To create todos we must create
a `POST` handler. The todo to create is stored in the request body.

{{< highlight go >}}
func (c *Controller) CreateTodo(w http.ResponseWriter, r *http.Request) {
    ctx := goserv.Context(r)
    todo := &Todo{}

    if err := goserv.ReadJSONBody(r, todo); err != nil {
        ctx.Error(fmt.Errorf("todo not well-formed"), http.StatusBadRequest)
        return
    }

    if err := c.todos.Insert(todo); err != nil {
        ctx.Error(err, http.StatusInternalServerError)
        return
    }

    w.WriteHeader(http.StatusCreated)
}
{{< /highlight >}}

The last handler allows us to delete existing todos:

{{< highlight go >}}
func (c *Controller) DeleteTodo(w http.ResponseWriter, r *http.Request) {
    ctx := goserv.Context(r)
    hexID := ctx.Param("todo_id")
    objectID := bson.ObjectIdHex(hexID)

    if err := c.todos.RemoveId(objectID); err != nil {
        ctx.Error(err, http.StatusInternalServerError)
        return
    }

    w.WriteHeader(http.StatusNoContent)
}
{{< /highlight >}}

With our controller ready the only part left is to assign each handler function to a specific
route:

{{< highlight go >}}
server.Get("/todos", controller.GetTodos)
server.Post("/todos", controller.CreateTodo)
server.Get("/todos/:todo_id", controller.GetTodo)
server.Delete("/todos/:todo_id", controller.DeleteTodo)
server.Param("todo_id", controller.TodoID)
{{< /highlight >}}

Basically that's it for our REST server. Of course there's still room for improvement, so let's take
a look at some custom error handling to send every occurring error as JSON response. First we need
an error handler:

{{< highlight go >}}
func (c *Controller) ErrorHandler(w http.ResponseWriter, r *http.Request, err *goserv.ContextError) {
    w.WriteHeader(err.Code)
    if err := goserv.WriteJSON(w, &struct{ Error string `json:"error"` }{err.Error()}); err != nil {
        log.Printf("Error sending JSON: %s", err)
    }
}
{{< /highlight >}}

We can use a simple anonymous struct containing the error message to write the `err` as simple
JSON error response. The last step is to set the custom error handler on the server:

{{< highlight go >}}
server.ErrorHandler = controller.ErrorHandler
{{< /highlight >}}

<div class="collapsable-codeblock">
<input type="checkbox" id="codeblock" />
<label for="codeblock">Full Example</label>
{{< highlight go >}}
package main

import (
    "fmt"
    "log"
    "net/http"
    "gopkg.in/mgo.v2"
    "gopkg.in/mgo.v2/bson"
    "github.com/gotschmarcel/goserv"
)

type Todo struct {
    ID bson.ObjectId `json:"id" bson:"_id,omitempty"`
    Title string `json:"title"`
    Completed bool `json:"completed"`
}

type Controller struct {
    todos *mgo.Collection
}

func (c *Controller) GetTodos(w http.ResponseWriter, r *http.Request) {
    todos := make([]*Todo, 0)

    if err := c.todos.Find(nil).All(&todos); err != nil {
        goserv.Context(r).Error(err, http.StatusInternalServerError)
        return
    }

    if err := goserv.WriteJSON(w, &todos); err != nil {
        goserv.Context(r).Error(err, http.StatusInternalServerError)
    }

}

func (c *Controller) GetTodo(w http.ResponseWriter, r *http.Request) {
    ctx := goserv.Context(r)
    hexID := ctx.Param("todo_id")
    objectID := bson.ObjectIdHex(hexID)
    todo := &Todo{}

    // Query the todo from MongoDB
    if err := c.todos.FindId(objectID).One(todo); err != nil {
        code := http.StatusInternalServerError

        // Todo not found
        if err == mgo.ErrNotFound {
            err = fmt.Errorf("no such todo: %s", hexID)
            code = http.StatusNotFound
        }

        ctx.Error(err, code)
        return
    }

    // Pass todo to next handler
    if err := goserv.WriteJSON(w, todo); err != nil {
        ctx.Error(err, http.StatusInternalServerError)
        return
    }
}

func (c *Controller) TodoID(w http.ResponseWriter, r *http.Request, id string) {
    // Validate that the URL parameter is a valid Object ID representation
    if bson.IsObjectIdHex(id) {
        return
    }

    goserv.Context(r).Error(fmt.Errorf("invalid id: %s", id), http.StatusBadRequest)
}

func (c *Controller) CreateTodo(w http.ResponseWriter, r *http.Request) {
    ctx := goserv.Context(r)
    todo := &Todo{}

    if err := goserv.ReadJSONBody(r, todo); err != nil {
        ctx.Error(fmt.Errorf("todo not well-formed"), http.StatusBadRequest)
        return
    }

    if err := c.todos.Insert(todo); err != nil {
        ctx.Error(err, http.StatusInternalServerError)
        return
    }

    w.WriteHeader(http.StatusCreated)
}

func (c *Controller) DeleteTodo(w http.ResponseWriter, r *http.Request) {
    ctx := goserv.Context(r)
    hexID := ctx.Param("todo_id")
    objectID := bson.ObjectIdHex(hexID)

    if err := c.todos.RemoveId(objectID); err != nil {
        ctx.Error(err, http.StatusInternalServerError)
        return
    }

    w.WriteHeader(http.StatusNoContent)
}

func (c *Controller) ErrorHandler(w http.ResponseWriter, r *http.Request, err *goserv.ContextError) {
    w.WriteHeader(err.Code)
    if err := goserv.WriteJSON(w, &struct{ Error string `json:"error"` }{err.Error()}); err != nil {
        log.Printf("Error sending JSON: %s", err)
    }
}

func main() {
    server := goserv.NewServer()

    mongo, err := mgo.Dial("mongodb://localhost:27017")
    if err != nil {
        log.Fatalln(err)
    }

    // Don't forget to cleanup the session
    defer mongo.Close()

    // Create a new Controller with the "todos" collection
    controller := &Controller{mongo.DB("goserv_rest").C("todos")}

    server.Get("/todos", controller.GetTodos)
    server.Post("/todos", controller.CreateTodo)
    server.Get("/todos/:todo_id", controller.GetTodo)
    server.Delete("/todos/:todo_id", controller.DeleteTodo)
    server.Param("todo_id", controller.TodoID)

    server.ErrorHandler = controller.ErrorHandler

    log.Fatalln(server.Listen(":12345"))
}
{{< /highlight >}}
</div>
