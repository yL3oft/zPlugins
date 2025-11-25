---
description: >-
  zHomes triggers a few events. You can find a list with all the events on this
  page.
---

# Events

{% hint style="info" %}
You can see more detailed documentation about each holder and manager in the [JavaDocs](../../zhomes/api/javadocs.md).
{% endhint %}

## SendTeleportRequestEvent

Called when a player send a teleport request

## AcceptTeleportRequestEvent

Called when a player accept a teleport request

## DenyTeleportRequestEvent

Called when a player deny a teleport request

## CancelTeleportRequestEvent

Called when a player cancel a teleport request

## ExecuteMainCommandEvent

Called when **/ztpa (Main command)** is executed by a player

## Example

Example of a class listening to the AcceptTeleportRequestEvent canceling it the sender of the teleport request is "yLeoft2" and who accept is "yLeoft"

{% @github-files/github-code-block url="https://github.com/yL3oft/zTPA/blob/master/src/main/java/com/zTPA/api/examples/ExampleEvent.java" %}
