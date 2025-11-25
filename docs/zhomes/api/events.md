---
description: >-
  zHomes triggers a few events. You can find a list with all the events on this
  page.
---

# Events

{% hint style="info" %}
You can see more detailed documentation about each holder and manager in the [JavaDocs](javadocs.md).
{% endhint %}

## PreExecuteSethomeCommandEvent

Called when **/sethome** command is executed by a player

## PreExecuteDelhomeCommandEvent

Called when **/delhome** command is executed by a player

## PreExecuteHomeCommandEvent

Called when **/home** command is executed by a player

## ExecuteSethomeCommandEvent

Called when **/sethome (Home)** command is executed by a player

## ExecuteDelhomeCommandEvent

Called when **/delhome (Home)** command is executed by a player

## ExecuteHomesCommandEvent

Called when **/homes** command is executed by a player

## ExecuteMainCommandEvent

Called when **/zhomes (Main command)** is executed by a player

## RenameHomeEvent

Called when **/home rename** command is fully executed by a player

## TeleportToHomeEvent

Called when a player is teleported to a home

## Example

Example of a class listening to the PreExecuteSethomeCommandEvent and ExecuteSethomeCommandEvent and canceling it if the player's name is <kbd>yLeoft</kbd> (Or if the home's name is <kbd>test</kbd>)

On ExecuteSethomeCommandEvent it also sets the home to test if it's not the <kbd>test</kbd> home

{% @github-files/github-code-block url="https://github.com/yL3oft/zHomes/blob/master/src/main/java/com/zhomes/api/examples/ExampleEvent.java" %}
