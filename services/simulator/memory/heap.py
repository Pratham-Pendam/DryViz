class Heap:

    def __init__(self):
        self.objects = {}
        self.next_id = 1

    def allocate(self, value):

        object_id = self.next_id
        self.next_id += 1

        self.objects[object_id] = value

        return object_id

    def get(self, object_id):
        return self.objects[object_id]

    def snapshot(self):
        return self.objects.copy()