---
description: List of commands and permissions for the plugin
---

# Commands & Permissions

{% hint style="info" %}
All text between the less-than and greater-than signs (**<>**) is a placeholder/variable, replace it with the requested value without the less-than and greater-than signs (**<>**). Same apply for \[], but everything between \[ and ] are optional
{% endhint %}

## Commands

<table><thead><tr><th width="216">Command</th><th width="322">Permission (Default)</th><th>Description/zhomes</th></tr></thead><tbody><tr><td>/ztpa</td><td>ztpa.commands.main (True)</td><td>Main command for the plugin</td></tr><tr><td>/ztpa version</td><td>ztpa.commands.main.version (True)</td><td>Display the current version of the plugin</td></tr><tr><td>/ztpa reload</td><td>ztpa.commands.main.reload (OP)</td><td>Reloads the plugin's files. (<strong>MORE:</strong> <a href="ztpa-reload-less-than-type-greater-than.md">/ztpa reload &#x3C;type></a>)</td></tr><tr><td>/tpa &#x3C;player></td><td>ztpa.commands.tpa (True)</td><td>Sends a teleport request to an player</td></tr><tr><td>/tpaccept [player]</td><td>ztpa.commands.tpaccept (True)</td><td>Accepts a teleport request from a player</td></tr><tr><td>/tpdeny [player]</td><td>ztpa.commands.tpdeny (True)</td><td>Denys a teleport request from a player</td></tr><tr><td>/tpacancel [player]</td><td>ztpa.commands.tpacancel (True)</td><td>Cancels a teleport request to a player</td></tr></tbody></table>

## Permissions

{% hint style="info" %}
Command permissions is listed on [Commands](./#commands)
{% endhint %}

<table><thead><tr><th width="379">Permission</th><th>Use</th></tr></thead><tbody><tr><td>&#x3C;command_permission>.bypass.command-cost</td><td>Allows the player to bypass the cost of the command</td></tr></tbody></table>
