---
description: >-
  zHomes triggers a few events. You can find a list with all the events on this
  page.
---

# Events

{% hint style="info" %}
You can see more detailed documentation about each holder and manager in the [JavaDocs](../../zhomes/developer-api/javadocs.md).
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

Example of a class listening to the PreExecuteSethomeCommandEvent and ExecuteSethomeCommandEvent and canceling it if the player's name is <kbd>yLeoft</kbd> (Or if the home's name is <kbd>test</kbd>)

On ExecuteSethomeCommandEvent it also sets the home to test if it's not the <kbd>test</kbd> home

{% @github-files/github-code-block url="https://github.com/yL3oft/zTPA/blob/master/src/main/java/com/zTPA/api/examples/ExampleEvent.java" %}
