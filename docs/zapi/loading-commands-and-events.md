---
description: How to load command & events using zAPI
---

# Loading Commands & Events

## Using zAPI to load commands, events, permissions & tab completers

In order to load commands & events using zAPI you need a class called PluginYAMLManager, that basicly loads all the commands, tab completers, permissions & events without you needing to put anything in plugin.yml, allthough you still need to have[ commands & permissions field](#user-content-fn-1)[^1] on it.

PluginYAMLManager is a abstract class, which means it doesn't need any initialization or anything like that, so to load anything on it you basicly use this functions:

<table><thead><tr><th width="115">Load</th><th width="335">Usage</th><th>Params</th></tr></thead><tbody><tr><td>Commands</td><td><code>PluginYAMLManager.registerCommand()</code></td><td><p></p><pre><code>1 - The name of the command.
2 - The CommandExecutor for the command.
3 (Optional) - The cooldown of the command
4 (Optional) - The TabCompleter for the command.
5 - The description of the command.
6 - The aliases for the command.
</code></pre></td></tr><tr><td>Events</td><td><code>PluginYAMLManager.registerEvent()</code></td><td><p></p><pre><code>1 - The Listener class
</code></pre></td></tr><tr><td>Permissions</td><td><code>PluginYAMLManager.registerPermission()</code></td><td><p></p><pre><code>1 - The permission
2 (Optional) - Description
3 (Optional) - PermissionDefault
4 (Optional) - Permission childrens
</code></pre></td></tr></tbody></table>

[^1]: ```yaml
    commands: {}
    permissions: {}
    ```
