# class Memory:
#     def __init__(self):
#         self.variables = {}

#     def set(self, name, value):
#         self.variables[name] = value

#     def get(self, name):
#         if name not in self.variables:
#             raise Exception(f"Variable '{name}' not defined")
#         return self.variables[name]

#     def snapshot(self):
#         return dict(self.variables)
    
class Memory:
    def __init__(self):
        self.stack = [{}]  # global frame

    def push_frame(self):
        self.stack.append({})

    def pop_frame(self):
        self.stack.pop()

    def set(self, name, value):
        self.stack[-1][name] = value

    def get(self, name):
        for frame in reversed(self.stack):
            if name in frame:
                return frame[name]
        raise Exception(f"Variable '{name}' not found")

    def snapshot(self):
        return {
            "stack": [frame.copy() for frame in self.stack]
        }    