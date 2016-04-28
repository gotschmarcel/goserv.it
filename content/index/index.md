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
    "github.com/gotschmarcel/goserv"
    "log"
)

func main() {
    server := goserv.NewServer()

    server.Get("/", func (w goserv.ResponseWriter, r *goserv.Request) {
            w.WriteString("Welcome Home")
    })

    log.Fatalln(server.Listen(":12345"))
}
{{< /highlight >}}
