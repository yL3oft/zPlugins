---
description: List of all plugin's MiniPlaceholders placeholders
---

# MiniPlaceholders

{% hint style="info" %}
All text between the less-than and greater-than signs (**<>**) is a placeholder/variable, replace it with the requested value without the less-than and greater-than signs (**<>**).
{% endhint %}

## What's MiniPlaceholders?

[**MiniPlaceholders**](https://github.com/MiniPlaceholders/MiniPlaceholders) is a modern placeholder plugin designed for the MiniMessage text format. It integrates seamlessly with Kyori's Adventure API and provides a cleaner, more flexible placeholder syntax.

## Installation

The expansion is built into **zHomes** itself. As long as you have MiniPlaceholders installed, the placeholder expansion will automatically register.

## Placeholder Syntax

MiniPlaceholders uses the `<identifier_key:arg1:arg2>` format. Arguments are separated by colons (`:`).

## Placeholder Types

### Global Placeholders

These placeholders don't require a player context and work anywhere.

| Placeholder | Description | Output Example |
|------------|-------------|----------------|
| `<zhomes_version>` | Returns the current version of zHomes | `1.0.0` |

### Audience Placeholders

These placeholders use the viewing player as context (the player seeing the text).

| Placeholder | Description | Output Example |
|------------|-------------|----------------|
| `<zhomes_hashome:<home>>` | Check if the viewing player has a home called `<home>` | `True` \| `False` |
| `<zhomes_set>` | Number of homes the viewing player has | `10` |
| `<zhomes_numberofhomes>` | Number of homes the viewing player has (alias) | `10` |
| `<zhomes_homes>` | All homes the viewing player has | `home1, home2, home3` |
| `<zhomes_limit>` | The limit of homes the viewing player can have | `15` |
| `<zhomes_max>` | The limit of homes the viewing player can have (alias) | `15` |
| `<zhomes_set/max>` | Homes set vs limit, or "Disabled" if no limit | `10/15` \| `Disabled` |
| `<zhomes_numberofhomes/limit>` | Homes set vs limit (alias) | `10/15` \| `Disabled` |

### Home-Specific Placeholders (Audience)

These placeholders retrieve information about the viewing player's homes by index number (1-based).

| Placeholder | Description | Output Example |
|------------|-------------|----------------|
| `<zhomes_home:<number>>` | Name of the viewing player's home at index `<number>` | `home1` |
| `<zhomes_home_world:<number>>` | World name of the home | `world_the_end` |
| `<zhomes_home_x:<number>>` | X coordinate (rounded) | `123` |
| `<zhomes_home_y:<number>>` | Y coordinate (rounded) | `64` |
| `<zhomes_home_z:<number>>` | Z coordinate (rounded) | `-456` |
| `<zhomes_home_pitch:<number>>` | Pitch (rounded) | `15` |
| `<zhomes_home_yaw:<number>>` | Yaw (rounded) | `90` |
| `<zhomes_home_x_full:<number>>` | X coordinate (full precision) | `123.456789` |
| `<zhomes_home_y_full:<number>>` | Y coordinate (full precision) | `64.000000` |
| `<zhomes_home_z_full:<number>>` | Z coordinate (full precision) | `-456.123456` |
| `<zhomes_home_pitch_full:<number>>` | Pitch (full precision) | `15.234567` |
| `<zhomes_home_yaw_full:<number>>` | Yaw (full precision) | `90.123456` |
| `<zhomes_home_x:<number>:<decimals>>` | X coordinate with `<decimals>` decimal places | `123.45` |
| `<zhomes_home_y:<number>:<decimals>>` | Y coordinate with `<decimals>` decimal places | `64.00` |
| `<zhomes_home_z:<number>:<decimals>>` | Z coordinate with `<decimals>` decimal places | `-456.12` |
| `<zhomes_home_pitch:<number>:<decimals>>` | Pitch with `<decimals>` decimal places | `15.23` |
| `<zhomes_home_yaw:<number>:<decimals>>` | Yaw with `<decimals>` decimal places | `90.12` |

### Player-Targeted Placeholders

These placeholders let you query information about a **specific player** by providing their name as the first argument.

Use the format: `<zhomes_key:playername:args>`

| Placeholder | Description | Output Example |
|------------|-------------|----------------|
| `<zhomes_hashome:<name>:<home>>` | Check if `<name>` has a home called `<home>` | `True` \| `False` |
| `<zhomes_set:<name>>` | Number of homes `<name>` has | `5` |
| `<zhomes_homes:<name>>` | All homes `<name>` has | `spawn, base, farm` |
| `<zhomes_home:<name>:<number>>` | Name of `<name>`'s home at index `<number>` | `spawn` |
| `<zhomes_home_world:<name>:<number>>` | World of `<name>`'s home | `world` |
| `<zhomes_home_x:<name>:<number>>` | X coordinate of `<name>`'s home | `100` |
| `<zhomes_home_y:<name>:<number>>` | Y coordinate of `<name>`'s home | `64` |
| `<zhomes_home_z:<name>:<number>>` | Z coordinate of `<name>`'s home | `-200` |

**Examples:**
```
<zhomes_home:Steve:1>              → Steve's first home name
<zhomes_set:Alex>                  → Number of homes Alex has
<zhomes_home_world:Notch:2>        → World of Notch's second home
<zhomes_hashome:Player1:base>      → Check if Player1 has a home named "base"
```

## Comparison with PlaceholderAPI

| Feature | MiniPlaceholders | PlaceholderAPI |
|---------|-----------------|----------------|
| **Syntax** | `<zhomes_key:args>` | `%zhomes_key_args%` |
| **Separator** | Colon (`:`) | Underscore (`_`) |
| **Format** | MiniMessage-native | Legacy text |
| **Player targeting** | `<key:player:args>` | `%player_<player>_key_args%` |

## Usage in MiniMessage

MiniPlaceholders work seamlessly with MiniMessage formatting:

```xml
<gradient:red:blue>You have <zhomes_set> homes!</gradient>
<hover:show_text:'<zhomes_home:1>'><gold>Your first home</gold></hover>
<click:run_command:'/home <zhomes_home:1>'>Teleport to <zhomes_home:1></click>
```

## Notes

{% hint style="success" %}
Even without MiniPlaceholders installed, placeholders using the `<identifier_key:args>` format still work inside zHomes' own configuration files as a fallback.
{% endhint %}

{% hint style="info" %}
For legacy PlaceholderAPI support, see the [PlaceholderAPI](placeholderapi.md) page.
{% endhint %}

{% hint style="warning" %}
Player-targeted placeholders are registered as **global placeholders** in MiniPlaceholders, meaning they work everywhere but don't strictly require an audience context.
{% endhint %}