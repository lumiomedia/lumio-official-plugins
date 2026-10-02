# Changelog

## 0.1.5

- The index card keeps showing a running scan after you leave Settings and come back, and Cancel stops it. Rebuild and Update no longer answer "library scan already running" while a scan you can't see holds the lock; if another library is indexing, the card says so.
- In TV mode the settings text, inputs and library rows are drawn at TV size instead of desktop size.

## 0.1.4

- When indexing stops, the message now says where: which library or series, whether Emby or Lumio's own index failed, and after how many tries. The same details go to the debug log.
- Series are read in pages of 300 episodes, and a library page that keeps failing is retried with smaller pages. Very large pages could take longer than the proxy in front of some Emby servers waits, and failed the same way on every try.
- A series too large for Lumio's index is no longer the end of the scan: it is sent with its newest episodes, and the settings panel lists which series were cut.

## 0.1.3

- Indexing large Emby servers no longer stops halfway. A slow answer or a dropped connection used to end the whole scan ("signal is aborted without reason" or "Failed to fetch"); each request now waits longer and is retried before giving up.

## 0.1.2

- Loads again on Lumio 0.1.617. The copy of the plugin that ships inside that app version stopped at startup, so the plugin never appeared; this version replaces it automatically.

## 0.1.1

- Large libraries with many series can be indexed without the scan stopping halfway. Series were sent to Lumio 200 at a time with every episode included, which could be several megabytes per request. That was more than Lumio accepts, so the scan stopped with "Failed to fetch". Titles are now sent in smaller batches.

## 0.1.0

- First version: sign in with server address, username and password; pick movie and series libraries; build the index; Emby tab and library mode; direct-play versions with HDR and Dolby Vision labels; progress back to Emby.
