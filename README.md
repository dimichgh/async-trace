# async-trace
=============

Provides an API to instrument an async code to collect metrics per request.

# Installation

`npm install async-trace --save`

# Usage

### Hook to receive events
```javascript
process.on('async-trace-evt', function (evt) {
    console.log(evt);
});
```

### Events

The event is an object that describes the specific moment in time for some metric, its relation to other events and main parent events.

#### Structure
 * name is non-unique name of the event
 * uid is a unique id for the event.
   * The uid structure is <process.env.NODE_UNIQUE_ID + ',' + timestamp + ',' + counter>
     * counter is incremented number in case timestamp is the same for more than one event
   * It may contain relationship to the parent event, example
     ```
     uid = parent.uid + '/' + evt.uid
     ```
 * timestamp of when it happened
 * duration is time spent between creation of the event and complete call.
 * children (options), complex event must have it
 * master specifies if this is a master event
 * attributes can contain custom attributes for the specific events, existing:
    * class:
        * event is a simple event
        * span is a span event

#### Types
* Simple event is simple event.
* Span event is a complex event that have two events (start and end) and may have nested events
* Master event is the top-level event for the request flow that contains all other events

#### Example
```json
{
    "data": {
        "name": "event name",
        "uid": "auto-geenrated-uuid",
        "timestamp": 16762176271,
        "duration": 0,
        "master": true,
        "attributes": {
            "class": "event"
        }
    }
}
```

### Create a simple event
```javascript
var event = require('async-trace').create('test');
event.data.foo = 'bar';
event.complete('success');
```

### Create a span event
```javascript
require('async-trace').create('test', function (event) {
    event.data.foo = 'bar';
    event.complete('success');
});
```

### Create a span event with nested events
```javascript
var AsyncTrace = require('async-trace');

AsyncTrace.create('test', function (event) {
    event.data.foo = 'bar';

    AsyncTrace.create('child-Foo').complete();

    setTimeout(function delayedEvent() {        
        AsyncTrace.create('child-Bar').complete();
    }, 100);

    event.complete('success');
});
```

### Create a span event with nested span events
```javascript
var AsyncTrace = require('async-trace');

AsyncTrace.create('test', function (event) {
    event.data.foo = 'bar';

    AsyncTrace.create('child-span-Foo', function (fooEvent) {
        AsyncTrace.create('child-Foo').complete();
        fooEvent.complete('fail');
    });

    setTimeout(function delayedEvent() {        
        AsyncTrace.create('child-span-Bar', function (fooEvent) {
            AsyncTrace.create('child-Bar').complete();
            fooEvent.complete('success');
        });
    }, 100);

    event.complete('success');
});
```
