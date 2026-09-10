# class Timeline:
#     def __init__(self):
#         self.steps = []
#         self.step_count = 0

#     def record(self, line, memory):
#         self.steps.append({
#             "step": self.step_count,
#             "line": line,
#             "memory": memory
#         })
#         self.step_count += 1

#     def get(self):
#         return self.steps


class Timeline:
    def __init__(self):
        self.steps = []

    def record(self, **data):
        self.steps.append(data)

    def get(self):
        return self.steps