+++
date = "2016-05-03T19:48:57+02:00"
keywords = ["release", "v1.0.0"]
title = "Release v1.0.0"
+++

goserv 1.0.0 is finally here and it brings more features. Additionally, new examples are available
in the **Getting Started** section to make the start with goserv easier.

<!--more-->

RequestContext.SkipRouter
: Calling `.SkipRouter` tells the current router to end processing, which means that
the parent router will continue.

Route.Rest
: Assign handlers to all methods currently without a handler.

goserv.AllowedHosts(hosts, useXForwardedHost)
: Create a middleware which validates the request host against a list of allowed hosts.

goserv.AddHeaders
: Create a middleware which adds headers to the response.

Path Groups
: Optional groups between two "/" now include the leading slash. That means that
`.Get("/abc/(def)?/hij", handler)` will match both `"/abc/hij"` and `"/abc/def/hij"`.

One thing that was removed from *goserv* is `Static`, since it had no benefits over `net/http`'s `.FileServer`. The license also changed from MIT to BSD.
