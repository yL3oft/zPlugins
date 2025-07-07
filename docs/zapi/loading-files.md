---
description: How to load files using zAPI
---

# Loading Files

## Loading/Creating YAML Files

In order to load YAML files using zAPI you will use a class used FileUtils, to manage and load your file, first things first, you need to define your file:

```java
File file = new File(getDataFolder(), "file.yml");
```

Then after defining your file, you create a FileUtils, using that file:

```java
FileUtils fileUtils = new FileUtils(file, "file.yml");
```

Then to load it you can use:

```java
fileUtils.saveDefaultConfig(); // Load the file or create it if not exist, also prevents from options to be deleted from it
fileUtils.reloadConfig(false); // Saves the file if created now, keep in mind that if you change that false to true, any deleted options from it, will always come back, which in some cases are not required
```

## Getting and Managing existing files

To get a existing file (Already loaded), you need to use FileManager class, that saves every loaded FileUtils and can restore it to you:

```
FileManager.getFileUtil("file.yml");
```

{% hint style="info" %}
You can also use FileManager.getFiles() to get all FileUtils that were loaded
{% endhint %}
