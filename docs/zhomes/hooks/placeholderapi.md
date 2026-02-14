---
description: List of all plugin's PlaceholderAPI placeholders
---

# PlaceholderAPI

{% hint style="info" %}
All text between the less-than and greater-than signs (**<>**) is a placeholder/variable, replace it with the requested value without the less-than and greater-than signs (**<>**).
{% endhint %}

## What's PlaceholderAPI?

[**PlaceholderAPI**](https://www.spigotmc.org/resources/6245/) is a popular plugin that allows plugins to communicate via placeholders. Every plugin that supports it can use placeholders from other plugins, and it includes a built-in system to download placeholder expansions from [**eCloud**](https://api.extendedclip.com/home/).

## Installation

The expansion is built into **zHomes** itself. As long as you have PlaceholderAPI installed, the placeholder expansion will automatically register—no need to download anything from eCloud.

## Placeholder Syntax

PlaceholderAPI uses the `%identifier_key_args%` format. Arguments are separated by underscores (`_`).

### Standard Placeholders

These placeholders use the viewing/command-executing player as context.

| Placeholder | Description | Output Example |
|------------|-------------|----------------|
| `%zhomes_version%` | Returns the current version of zHomes | `1.0.0` |
| `%zhomes_hashome_<home>` | Check if the player has a home with name `<home>` | `True` \| `False` |
| `%zhomes_set%` | Number of homes the player has | `10` |
| `%zhomes_numberofhomes%` | Number of homes the player has (alias) | `10` |
| `%zhomes_homes%` | All homes the player has | `home1, home2, home3` |
| `%zhomes_limit%` | The limit of homes the player can have | `15` |
| `%zhomes_max%` | The limit of homes the player can have (alias) | `15` |
| `%zhomes_set/max%` | Homes set vs limit, or "Disabled" if no limit | `10/15` \| `Disabled` |
| `%zhomes_numberofhomes/limit%` | Homes set vs limit (alias) | `10/15` \| `Disabled` |

### Home-Specific Placeholders

These placeholders retrieve information about a specific home by index number (1-based).

| Placeholder | Description | Output Example |
|------------|-------------|----------------|
| `%zhomes_home_<number>%` | Name of the player's home at index `<number>` | `home1` |
| `%zhomes_home_<number>_world%` | World name of the home | `world_the_end` |
| `%zhomes_home_<number>_x%` | X coordinate (rounded) | `123` |
| `%zhomes_home_<number>_y%` | Y coordinate (rounded) | `64` |
| `%zhomes_home_<number>_z%` | Z coordinate (rounded) | `-456` |
| `%zhomes_home_<number>_pitch%` | Pitch (rounded) | `15` |
| `%zhomes_home_<number>_yaw%` | Yaw (rounded) | `90` |
| `%zhomes_home_<number>_x_full%` | X coordinate (full precision) | `123.456789` |
| `%zhomes_home_<number>_y_full%` | Y coordinate (full precision) | `64.000000` |
| `%zhomes_home_<number>_z_full%` | Z coordinate (full precision) | `-456.123456` |
| `%zhomes_home_<number>_pitch_full%` | Pitch (full precision) | `15.234567` |
| `%zhomes_home_<number>_yaw_full%` | Yaw (full precision) | `90.123456` |
| `%zhomes_home_<number>_x_<decimals>%` | X coordinate with `<decimals>` decimal places | `123.45` |
| `%zhomes_home_<number>_y_<decimals>%` | Y coordinate with `<decimals>` decimal places | `64.00` |
| `%zhomes_home_<number>_z_<decimals>%` | Z coordinate with `<decimals>` decimal places | `-456.12` |
| `%zhomes_home_<number>_pitch_<decimals>%` | Pitch with `<decimals>` decimal places | `15.23` |
| `%zhomes_home_<number>_yaw_<decimals>%` | Yaw with `<decimals>` decimal places | `90.12` |

### Player-Targeted Placeholders

These placeholders let you query information about a **different player** by specifying their name.

Use the format: `%zhomes_player_<playername>_<key>_<args>%`

| Placeholder | Description | Output Example |
|------------|-------------|----------------|
| `%zhomes_player_<name>_hashome_<home>%` | Check if `<name>` has a home called `<home>` | `True` \| `False` |
| `%zhomes_player_<name>_set%` | Number of homes `<name>` has | `5` |
| `%zhomes_player_<name>_homes%` | All homes `<name>` has | `spawn, base, farm` |
| `%zhomes_player_<name>_home_<number>%` | Name of `<name>`'s home at index `<number>` | `spawn` |
| `%zhomes_player_<name>_home_<number>_world%` | World of `<name>`'s home | `world` |
| `%zhomes_player_<name>_home_<number>_x%` | X coordinate of `<name>`'s home | `100` |

**Example:**
```
%zhomes_player_Steve_home_1%           → Steve's first home name
%zhomes_player_Alex_set%               → Number of homes Alex has
%zhomes_player_Notch_home_2_world%     → World of Notch's second home
```

## Notes

{% hint style="success" %}
Even without PlaceholderAPI installed, all placeholders still work inside zHomes' own configuration files.
{% endhint %}

{% hint style="info" %}
For MiniMessage/MiniPlaceholders support, see the [MiniPlaceholders](miniplaceholders.md) page.
{% endhint %}