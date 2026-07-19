#!/bin/sh
# Notify IndexNow-participating engines (Bing/Copilot, DuckDuckGo, Seznam, …)
# that the site's pages changed. Run after deploying content changes.
curl -s -w '\nHTTP %{http_code}\n' -X POST https://api.indexnow.org/indexnow \
  -H 'Content-Type: application/json; charset=utf-8' \
  -d '{
  "host": "vicktorhugoqs.github.io",
  "key": "e0d141e04cbeb4a17f89460ef0e90079",
  "keyLocation": "https://vicktorhugoqs.github.io/gulbenkian-guide/e0d141e04cbeb4a17f89460ef0e90079.txt",
  "urlList": [
    "https://vicktorhugoqs.github.io/gulbenkian-guide/",
    "https://vicktorhugoqs.github.io/gulbenkian-guide/highlights-2-hours/",
    "https://vicktorhugoqs.github.io/gulbenkian-guide/faq/"
  ]
}'
