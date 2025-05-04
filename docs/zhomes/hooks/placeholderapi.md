---
description: List of all plugin's placeholders
---

# PlaceholderAPI

{% hint style="info" %}
All text between the less-than and greater-than signs (**<>**) is a placeholder/variable, replace it with the requested value without the less-than and greater-than signs (**<>**).
{% endhint %}

## What's PlaceholderAPI?

[**PlaceholderAPI**](https://www.spigotmc.org/resources/6245/) is a famous plugin that allows plugins to communicate via placeholders, every plugin that supports it can have placeholders from other plugins that have it, also it has a built-in system to download placeholders from a platform called [**eCloud**](https://api.extendedclip.com/home/) that have thousands of placeholder expansions that can be used on your server.

## Placeholders

**zHomes** plugin provides [**PlaceholderAPI** ](https://www.spigotmc.org/resources/6245/)placeholders that you can be used in any plugin that supports [**PlaceholderAPI**](https://www.spigotmc.org/resources/6245/)**.**

The expansion is inside the plugin itself, meaning that you don't have to download it from [**eCloud**](https://api.extendedclip.com/home/), as long as you have PlaceholderAPI installed, the placeholder expansion will be there.

<table><thead><tr><th width="282">Placeholder</th><th width="328">Description</th><th width="138">Output Type</th></tr></thead><tbody><tr><td>%zhomes_hashome_&#x3C;home>%</td><td>Check if the player has a home with name <a data-footnote-ref href="#user-content-fn-1">home</a></td><td>True or False</td></tr><tr><td>%zhomes_numberofhomes%</td><td>Number of homes a player have</td><td>Number</td></tr><tr><td>%zhomes_homes%</td><td>All homes a player have (<kbd>home1, home2, home3</kbd>)</td><td>Text</td></tr><tr><td>%zhomes_limit%</td><td>The limit of homes a player can have</td><td>Number</td></tr><tr><td>%zhomes_numberofhomes/limit%</td><td>Same thing to "%zhomes_numberofhomes%/%zhomes_limit%", but return "Disabled" is limit is not enabled on the plugin</td><td>Text</td></tr></tbody></table>

{% hint style="info" %}
Even if you don't have PlaceholderAPI installed, all of these placeholders will still work inside the plugin & it's configuration files
{% endhint %}

[^1]: <kbd>\<home></kbd> in the placeholder
