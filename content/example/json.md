+++
date = "2016-05-03T15:18:26+02:00"
draft = true
keywords = []
title = "JSON API"

[menu.main]
    parent = "getting_started"
    name = "JSON Support"
    weight = 15
+++

*goserv* also provides some convenience functions which make the handling of JSON even easier:

{{< highlight go >}}
func JSONEchoHandler(w http.ResponseWriter, r *http.Request) {
    var data struct { Title string }

    if err := goserv.ReadJSONBody(r, &data); err != nil {
        goserv.Context(r).Error(err, 400)
    }

    goserv.WriteJSON(w, &data)
}
{{< /highlight >}}

Calling `.WriteJSON` marshals the data into the response body and sets the response header
`Content-Type: application/json`.
