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

The next thing we need is a controller providing handler functions for the API as well as a
connection to MongoDB.

{{< highlight go >}}
type Controller struct {
    dbSession *mgo.Session    // Connection to MongoDB
    todos     *mgo.Collection // ToDos collection
}
{{< /highlight >}}

The `Controller` stores the [`mgo.Session`](https://godoc.org/gopkg.in/mgo.v2#Session) and the
MongoDB collection containing our ToDos. Since `mgo.Session` needs to be closed at the end we
provide a `Cleanup` method on our controller which will be used in `main` to cleanup our
session.

{{< highlight go >}}
func (c *Controller) Cleanup() {
    if c.dbSession == nil {
        return
    }

    c.dbSession.Close()
}
{{< /highlight >}}

Before we start the server we want to connect to MongoDB. For that we provide a function called
`ConnectDB`:

{{< highlight go >}}
func (c *Controller) ConnectDB(url, db string) error {
    if c.dbSession != nil {
        c.dbSession.Close()
    }

    session, err := mgo.Dial(url)
    if err != nil {
        return err
    }

    c.dbSession = session
    c.todos = session.DB(db).C("todos")

    return nil
}
{{< /highlight >}}

Now let's add the controller to the `main`:

{{< highlight go >}}
controller := &Controller{}

if err := controller.ConnectDB("mongodb://localhost:27017", "goserv_rest"); err != nil {
    log.Fatalln(err)
}

// Don't forget to cleanup the mgo.Session
defer controller.Cleanup()
{{< /highlight >}}

Since we're now ready to interact with MongoDB it's time to write some route handlers for our
API. Let's start with the simplest one - requesting all todos from our database:

{{< highlight go >}}
func (c *Controller) GetTodos(w goserv.ResponseWriter, r *goserv.Request) {
    todos := make([]*Todo, 0)

    if err := c.todos.Find(nil).All(&todos); err != nil {
        w.SetError(err)
        return
    }

    w.WriteJSON(&todos)
}
{{< /highlight >}}

Here makes it *goserv* easy for us by providing `WriteJSON` which automatically encodes the passed
values into JSON and sets the *Content-Type* to `application/json`. To retrieve only a single todo
by its ID we make use of URL parameters `/todos/:todo_id`. The parameter is extracted by goserv
and can be retrieved from the request `r.Params.Get("todo_id")`:

{{< highlight go >}}
func (c *Controller) GetTodo(w goserv.ResponseWriter, r *goserv.Request) {
    hexID := r.Params.Get("todo_id")
    oid := bson.ObjectIdHex(hexID)
    todo := &Todo{}

    // Query the todo from MongoDB
    if err := c.todos.FindId(oid).One(todo); err != nil {

        // Todo not found
        if err == mgo.ErrNotFound {
            w.SetError(fmt.Errorf("no such todo: %s", hexID))
            return
        }

        w.SetError(err)
        return
    }

    // Pass todo to next handler
    w.WriteJSON(todo)
}
{{< /highlight >}}

To make sure that we always get a valid ObjectID in our handlers we make use of goserv's parameter handlers.
The parameter handler gets invoked once before the handlers are processed.

{{< highlight go >}}
func (c *Controller) TodoID(w goserv.ResponseWriter, r *goserv.Request, id string) {
    // Validate that the URL parameter is a valid Object ID representation
    if bson.IsObjectIdHex(id) {
        return
    }

    w.SetError(fmt.Errorf("invalid id: %s", id))
}
{{< /highlight >}}

Now we're able to query all of our todos or only a single todo. To create todos we must create
a `POST` handler. The todo to create is stored in the request body.

{{< highlight go >}}
func (c *Controller) CreateTodo(w goserv.ResponseWriter, r *goserv.Request) {
    todo := &Todo{}

    if err := r.ReadJSON(todo); err != nil {
        w.SetError(fmt.Errorf("todo not well-formed"))
        return
    }

    if err := c.todos.Insert(todo); err != nil {
        w.SetError(err)
        return
    }

    w.WriteHeader(http.StatusCreated)
}
{{< /highlight >}}

The last handler allows us to delete existing todos:

{{< highlight go >}}
func (c *Controller) DeleteTodo(w goserv.ResponseWriter, r *goserv.Request) {
    hexID := r.Params.Get("todo_id")
    oid := bson.ObjectIdHex(hexID)

    if err := c.todos.RemoveId(oid); err != nil {
        w.SetError(err)
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
func (c *Controller) ErrorHandler(w goserv.ResponseWriter, r *goserv.Request, err error) {
    w.WriteJSON(&struct{ Error string `json:"error"` }{err.Error()})
}
{{< /highlight >}}

We can use a simple anonymous struct containing the error message to write the `err` as simple
JSON error response. The last step is to set the custom error handler on the server:

{{< highlight go >}}
server.ErrorHandler = controller.ErrorHandler
{{< /highlight >}}

### The complete code

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
    dbSession *mgo.Session    // Connection to MongoDB
    todos     *mgo.Collection // ToDos collection
}

func (c *Controller) Cleanup() {
    if c.dbSession == nil {
        return
    }

    c.dbSession.Close()
}

func (c *Controller) ConnectDB(url, db string) error {
    if c.dbSession != nil {
        c.dbSession.Close()
    }

    session, err := mgo.Dial(url)
    if err != nil {
        return err
    }

    c.dbSession = session
    c.todos = session.DB(db).C("todos")

    return nil
}

func (c *Controller) GetTodos(w goserv.ResponseWriter, r *goserv.Request) {
    todos := make([]*Todo, 0)

    if err := c.todos.Find(nil).All(&todos); err != nil {
        w.SetError(err)
        return
    }

    w.WriteJSON(&todos)
}

func (c *Controller) GetTodo(w goserv.ResponseWriter, r *goserv.Request) {
    hexID := r.Params.Get("todo_id")
    oid := bson.ObjectIdHex(hexID)
    todo := &Todo{}

    // Query the todo from MongoDB
    if err := c.todos.FindId(oid).One(todo); err != nil {

        // Todo not found
        if err == mgo.ErrNotFound {
            w.SetError(fmt.Errorf("no such todo: %s", hexID))
            return
        }

        w.SetError(err)
        return
    }

    // Pass todo to next handler
    w.WriteJSON(todo)
}

func (c *Controller) TodoID(w goserv.ResponseWriter, r *goserv.Request, id string) {
    // Validate that the URL parameter is a valid Object ID representation
    if bson.IsObjectIdHex(id) {
        return
    }

    w.SetError(fmt.Errorf("invalid id: %s", id))
}

func (c *Controller) CreateTodo(w goserv.ResponseWriter, r *goserv.Request) {
    todo := &Todo{}

    if err := r.ReadJSON(todo); err != nil {
        w.SetError(fmt.Errorf("todo not well-formed"))
        return
    }

    if err := c.todos.Insert(todo); err != nil {
        w.SetError(err)
        return
    }

    w.WriteHeader(http.StatusCreated)
}

func (c *Controller) DeleteTodo(w goserv.ResponseWriter, r *goserv.Request) {
    hexID := r.Params.Get("todo_id")
    oid := bson.ObjectIdHex(hexID)

    if err := c.todos.RemoveId(oid); err != nil {
        w.SetError(err)
        return
    }

    w.WriteHeader(http.StatusNoContent)
}

func (c *Controller) ErrorHandler(w goserv.ResponseWriter, r *goserv.Request, err error) {
    w.WriteJSON(&struct{ Error string `json:"error"` }{err.Error()})
}


func main() {
    server := goserv.NewServer()
    controller := &Controller{}

    if err := controller.ConnectDB("mongodb://localhost:27017", "goserv_rest"); err != nil {
        log.Fatalln(err)
    }

    // Don't forget to cleanup the mgo.Session
    defer controller.Cleanup()

    server.Get("/todos", controller.GetTodos)
    server.Post("/todos", controller.CreateTodo)
    server.Get("/todos/:todo_id", controller.GetTodo)
    server.Delete("/todos/:todo_id", controller.DeleteTodo)
    server.Param("todo_id", controller.TodoID)

    server.ErrorHandler = controller.ErrorHandler

    log.Fatalln(server.Listen(":12345"))
}
{{< /highlight >}}
