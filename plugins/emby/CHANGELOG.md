# Changelog

## 0.1.1

- Large libraries with many series can be indexed without the scan stopping halfway. Series were sent to Lumio 200 at a time with every episode included, which could be several megabytes per request. That was more than Lumio accepts, so the scan stopped with "Failed to fetch". Titles are now sent in smaller batches.

## 0.1.0

- First version: sign in with server address, username and password; pick movie and series libraries; build the index; Emby tab and library mode; direct-play versions with HDR and Dolby Vision labels; progress back to Emby.
