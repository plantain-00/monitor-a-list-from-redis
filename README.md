# monitor-a-list-from-redis
A simple tool to watch some realtime data from a redis source

## collect data

#### 1. for each node, count in current process

eg, you have `httpRequestCount` and `wsMessageReceivedCount` in every node.

#### 2. for each node, set a timer, every 1 second, increase the count in a redis string

eg, store them as string in redis, the keys of the strings are `counts:http:request` and `counts:ws:message:received`.

#### 3. set a global timer, every 1 second, get the counts, and push them(array, serialized to a string) to the list

eg, the key of the list is `counts`, and the value should be like `"[1,2]"`

if the list's length > 60, remove the last element, it just keep the data of recent 60 seconds.
