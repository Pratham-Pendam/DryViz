class Memory:

    def __init__(self):

        # Global frame
        self.stack = [
            {
                "function": "main",
                "locals": {}
            }
        ]

    # -----------------------------
    # Push new stack frame
    # -----------------------------

    def push_frame(self, function_name):

        self.stack.append({
            "function": function_name,
            "locals": {}
        })

    # -----------------------------
    # Pop stack frame
    # -----------------------------

    def pop_frame(self):

        if len(self.stack) > 1:
            self.stack.pop()

    # -----------------------------
    # Set variable
    # -----------------------------

    def set(self, name, value):

        self.stack[-1]["locals"][name] = value

    # -----------------------------
    # Get variable
    # -----------------------------

    def get(self, name):

        # Search from top frame downward
        for frame in reversed(self.stack):

            locals_dict = frame["locals"]

            if name in locals_dict:
                return locals_dict[name]

        raise Exception(f"Variable '{name}' not found")

    # -----------------------------
    # Snapshot
    # -----------------------------

    def snapshot(self):

        result = []

        for frame in self.stack:

            result.append({
                "function": frame["function"],
                "locals": frame["locals"].copy()
            })

        return result