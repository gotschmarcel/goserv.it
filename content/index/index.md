+++
date = "2016-04-27T17:03:02+02:00"
title = "index"
+++

## Get Right Into It

### Installation

{{< highlight bash >}}
$ go get github.com/gotschmarcel/goserv
{{< /highlight >}}

### Simple Server

{{< highlight go >}}
package main

import (
    "log"
    "net/hettp"

    "github.com/gotschmarcel/goserv"
)

func main() {
    server := goserv.NewServer()

    server.Get("/", func (w http.ResponseWriter, r *http.Request) {
            goserv.WriteString(w, "Welcome Home")
    })

    log.Fatalln(server.Listen(":12345"))
}
{{< /highlight >}}
