---
description: List of commands and permissions for the plugin
---

# Commands & Permissions

{% hint style="info" %}
All text between the less-than and greater-than signs (**<>**) is a placeholder/variable, replace it with the requested value without the less-than and greater-than signs (**<>**). Same apply for \[], but everything between \[ and ] are optional
{% endhint %}

## Commands

<table><thead><tr><th width="216">Command</th><th width="322">Permission (Default)</th><th>Description/zhomes</th></tr></thead><tbody><tr><td>/zhomes</td><td>zhomes.commands.main (True)</td><td>Main command for the plugin</td></tr><tr><td>/zhomes version</td><td>zhomes.commands.main.version (True)</td><td>Display the current version of the plugin</td></tr><tr><td>/zhomes version --update</td><td>zhomes.commands.main.version.update (OP)</td><td>Updates the current plugin version for you</td></tr><tr><td>/zhomes info</td><td>zhomes.commands.main.info (True)</td><td>Display useful info about the plugin</td></tr><tr><td>/zhomes reload</td><td>zhomes.commands.main.reload (OP)</td><td>Reloads the plugin's files. (<strong>MORE:</strong> <a href="zhomes-reload-less-than-type-greater-than.md">/zhomes reload &#x3C;type></a>)</td></tr><tr><td>/zhomes converter &#x3C;type></td><td>zhomes.commands.main.converter (OP)</td><td>Use to convert data from a place to another (<strong>MORE:</strong> <a href="zhomes-converter-less-than-type-greater-than.md">/zhomes converter &#x3C;type></a>)</td></tr><tr><td>/sethome &#x3C;home></td><td>zhomes.commands.sethome (True)</td><td>Sets a home to your current location</td></tr><tr><td>/sethome &#x3C;player:home></td><td>zhomes.commands.sethome.others (OP)</td><td>Sets a player's home to your current location</td></tr><tr><td>/delhome &#x3C;home></td><td>zhomes.commands.delhome (True)</td><td>Deletes a home</td></tr><tr><td>/delhome &#x3C;player:home></td><td>zhomes.commands.delhome.others (OP)</td><td>Deletes a player's home</td></tr><tr><td>/home &#x3C;home></td><td>zhomes.commands.home (True)</td><td>Teleports you to a home</td></tr><tr><td>/home &#x3C;player:home></td><td>zhomes.commands.home.others (OP)</td><td>Teleports you to a player's home</td></tr><tr><td>/home rename &#x3C;home> &#x3C;newname></td><td>zhomes.commands.home.rename (True)</td><td>Renames a home</td></tr><tr><td>/homes [page]</td><td>zhomes.commands.homes (True)</td><td>List all homes you have</td></tr><tr><td>/homes &#x3C;player> [page]</td><td>zhomes.commands.homes.others (OP)</td><td>List all homes of a player</td></tr></tbody></table>

## Permissions

{% hint style="info" %}
Command permissions is listed on [Commands](./#commands)
{% endhint %}

<table><thead><tr><th width="379">Permission</th><th>Use</th></tr></thead><tbody><tr><td>zhomes.bypass.limit</td><td>Allows the player to bypass the limit of homes</td></tr><tr><td>zhomes.bypass.dimensionalteleportation</td><td>Allows the player to bypass the dimensional teleportation config</td></tr><tr><td>&#x3C;command_permission>.bypass.command-cost</td><td>Allows the player to bypass the cost of the command</td></tr></tbody></table>
