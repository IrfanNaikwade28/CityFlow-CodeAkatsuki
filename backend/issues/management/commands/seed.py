from datetime import date, timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from accounts.models import User
from issues.models import Issue, IssueComment, IssueTimeline, IssueUpvote
from bins.models import GarbageBin


def create_bins(workers):
    bins = [
        {
            "bin_id": "BIN-001",
            "location_text": "FC Road - Bus Stop",
            "ward": "Ward 1",
            "lat": 18.5167,
            "lng": 73.8416,
            "fill_level": 35,
            "capacity": 500,
            "assigned_worker": workers[0],
            "last_collected": timezone.now() - timedelta(days=1),
        },
        {
            "bin_id": "BIN-002",
            "location_text": "Bund Garden - Main Gate",
            "ward": "Ward 2",
            "lat": 18.5363,
            "lng": 73.8860,
            "fill_level": 78,
            "capacity": 500,
            "assigned_worker": workers[1],
            "last_collected": timezone.now() - timedelta(hours=6),
        },
        {
            "bin_id": "BIN-003",
            "location_text": "Kothrud - Community Hall",
            "ward": "Ward 3",
            "lat": 18.5074,
            "lng": 73.8077,
            "fill_level": 92,
            "capacity": 700,
            "assigned_worker": workers[2],
            "last_collected": timezone.now() - timedelta(days=3),
        },
    ]
    for data in bins:
        GarbageBin.objects.get_or_create(bin_id=data["bin_id"], defaults=data)


def build_timeline(status):
    steps = ["Submitted"]
    if status in ["Assigned", "In Progress", "Resolved", "Closed"]:
        steps.append("Assigned")
    if status in ["In Progress", "Resolved", "Closed"]:
        steps.append("In Progress")
    if status in ["Resolved", "Closed"]:
        steps.append("Resolved")
    if status == "Closed":
        steps.append("Closed")
    return steps


def create_issue_records(users, workers):
    now = timezone.now()

    demo_issues = [
        {
            "title": "Potholes near Shivajinagar",
            "description": "Multiple deep potholes are causing traffic slowdowns.",
            "category": "Road",
            "status": "Submitted",
            "ward": "Ward 1",
            "location_text": "Shivajinagar, near PMC Building",
            "location_lat": 18.5308,
            "location_lng": 73.8474,
            "image": "issues/before/potholes_shivajinagar.jpg",
            "reported_by": users[0],
            "assigned_to": None,
            "days_ago": 1,
            "upvotes": 2,
        },
        {
            "title": "Water leakage at Deccan Gymkhana",
            "description": "Continuous leak near junction, water pooling on road.",
            "category": "Water",
            "status": "Assigned",
            "ward": "Ward 2",
            "location_text": "Deccan Gymkhana junction",
            "location_lat": 18.5204,
            "location_lng": 73.8406,
            "image": "issues/before/water_leak_deccan.jpg",
            "reported_by": users[1],
            "assigned_to": workers[0],
            "days_ago": 2,
            "upvotes": 4,
        },
        {
            "title": "Streetlight outage near Balewadi Stadium",
            "description": "Three poles are out, area is dark at night.",
            "category": "Electricity",
            "status": "In Progress",
            "ward": "Ward 3",
            "location_text": "Balewadi Stadium, Gate 2",
            "location_lat": 18.5701,
            "location_lng": 73.7829,
            "image": "issues/before/streetlight_balewadi.jpg",
            "reported_by": users[2],
            "assigned_to": workers[1],
            "days_ago": 3,
            "upvotes": 3,
        },
        {
            "title": "Overflowing garbage near Koregaon Park",
            "description": "Garbage piles are attracting stray animals.",
            "category": "Garbage",
            "status": "Resolved",
            "ward": "Ward 4",
            "location_text": "Koregaon Park, Lane 5",
            "location_lat": 18.5362,
            "location_lng": 73.8939,
            "image": "issues/before/garbage_koregaon_park.jpg",
            "completion_photo": "issues/after/garbage_koregaon_park.jpg",
            "reported_by": users[0],
            "assigned_to": workers[2],
            "days_ago": 5,
            "upvotes": 5,
        },
        {
            "title": "Signal malfunction at Swargate",
            "description": "Traffic lights stuck on red for long intervals.",
            "category": "Traffic",
            "status": "Closed",
            "ward": "Ward 5",
            "location_text": "Swargate Bus Stand",
            "location_lat": 18.5018,
            "location_lng": 73.8636,
            "image": "issues/before/signal_swargate.jpg",
            "completion_photo": "issues/after/signal_swargate.jpg",
            "reported_by": users[1],
            "assigned_to": workers[3],
            "days_ago": 7,
            "upvotes": 6,
        },
        {
            "title": "Broken bench at Saras Baug",
            "description": "Bench slats are broken, unsafe for kids.",
            "category": "Public Facilities",
            "status": "Assigned",
            "ward": "Ward 6",
            "location_text": "Saras Baug, North Gate",
            "location_lat": 18.4953,
            "location_lng": 73.8569,
            "image": "issues/before/bench_saras_baug.jpg",
            "reported_by": users[2],
            "assigned_to": workers[4],
            "days_ago": 4,
            "upvotes": 1,
        },
        {
            "title": "Drain clogging in Katraj",
            "description": "Waterlogging after every rain.",
            "category": "Water",
            "status": "In Progress",
            "ward": "Ward 3",
            "location_text": "Katraj Main Road",
            "location_lat": 18.4529,
            "location_lng": 73.8652,
            "image": "issues/before/drain_katraj.jpg",
            "reported_by": users[0],
            "assigned_to": workers[5],
            "days_ago": 6,
            "upvotes": 2,
        },
        {
            "title": "Footpath damage near Vanaz",
            "description": "Tiles broken, pedestrians using road.",
            "category": "Road",
            "status": "Submitted",
            "ward": "Ward 2",
            "location_text": "Vanaz Metro Station, Exit A",
            "location_lat": 18.5070,
            "location_lng": 73.8073,
            "image": "issues/before/footpath_vanaz.jpg",
            "reported_by": users[1],
            "assigned_to": None,
            "days_ago": 1,
            "upvotes": 0,
        },
        {
            "title": "Garbage not cleared at FC Road",
            "description": "Bins full for 3 days, smell spreading.",
            "category": "Garbage",
            "status": "Resolved",
            "ward": "Ward 5",
            "location_text": "FC Road, Lane 3",
            "location_lat": 18.5175,
            "location_lng": 73.8419,
            "image": "issues/before/garbage_fc_road.jpg",
            "completion_photo": "issues/after/garbage_fc_road.jpg",
            "reported_by": users[2],
            "assigned_to": workers[6],
            "days_ago": 8,
            "upvotes": 7,
        },
        {
            "title": "Public toilet maintenance needed at Pune Station",
            "description": "Water supply low, cleaning overdue.",
            "category": "Public Facilities",
            "status": "Closed",
            "ward": "Ward 6",
            "location_text": "Pune Station, Platform 5",
            "location_lat": 18.5286,
            "location_lng": 73.8741,
            "image": "issues/before/toilet_pune_station.jpg",
            "completion_photo": "issues/after/toilet_pune_station.jpg",
            "reported_by": users[0],
            "assigned_to": workers[7],
            "days_ago": 10,
            "upvotes": 3,
        },
    ]

    for data in demo_issues:
        issue = Issue.objects.create(
            title=data["title"],
            description=data["description"],
            category=data["category"],
            status=data["status"],
            ward=data["ward"],
            location_text=data["location_text"],
            location_lat=data["location_lat"],
            location_lng=data["location_lng"],
            image=data.get("image"),
            completion_photo=data.get("completion_photo"),
            reported_by=data["reported_by"],
            assigned_to=data["assigned_to"],
            is_public=True,
            upvotes=0,
        )

        reported_at = now - timedelta(days=data["days_ago"])
        issue.reported_at = reported_at

        if data["status"] in ["Assigned", "In Progress", "Resolved", "Closed"]:
            issue.assigned_at = reported_at + timedelta(hours=6)
        if data["status"] in ["Resolved", "Closed"]:
            issue.resolved_at = reported_at + timedelta(days=2)

        issue.save()

        for idx, status in enumerate(build_timeline(data["status"])):
            IssueTimeline.objects.create(
                issue=issue,
                status=status,
                note=f"Demo status update: {status}",
                changed_at=reported_at + timedelta(hours=idx * 6),
            )

        IssueComment.objects.create(
            issue=issue,
            user=data["reported_by"],
            text="Demo note: issue reported for hackathon showcase.",
        )

        voter_pool = [u for u in users if u != data["reported_by"]]
        upvote_count = min(data["upvotes"], len(voter_pool))
        for voter in voter_pool[:upvote_count]:
            IssueUpvote.objects.create(issue=issue, user=voter)

        issue.upvotes = upvote_count
        issue.save()


class Command(BaseCommand):
    help = 'Seed the database with fresh CityFlow data — users, bins, and issues.'

    def handle(self, *args, **options):
        self.stdout.write('Clearing existing data...')
        IssueUpvote.objects.all().delete()
        IssueTimeline.objects.all().delete()
        IssueComment.objects.all().delete()
        Issue.objects.all().delete()
        GarbageBin.objects.all().delete()
        User.objects.all().delete()

        self.stdout.write('Creating admin...')

        admin = User.objects.create_superuser(
            username='admin',
            email='admin@cityflow.gov.in',
            password='admin1234',
            first_name='Admin',
            last_name='CityFlow',
            role='admin',
        )
        admin.display_id = 'A-00'
        admin.save()

        self.stdout.write('Creating citizens...')

        citizens = [
            dict(username='rajesh', email='rajesh@example.com', password='1234',
                 first_name='Rajesh', last_name='Patil', ward='Ward 5', phone='9876543210',
                 joined_date=date(2024, 3, 15), display_id='C-01'),
            dict(username='sunita', email='sunita@example.com', password='1234',
                 first_name='Sunita', last_name='Mane', ward='Ward 3', phone='9765432109',
                 joined_date=date(2024, 5, 20), display_id='C-02'),
            dict(username='amol', email='amol@example.com', password='1234',
                 first_name='Amol', last_name='Kumbhar', ward='Ward 7', phone='9654321098',
                 joined_date=date(2024, 7, 10), display_id='C-03'),
        ]

        for c in citizens:
            did = c.pop('display_id')
            u = User.objects.create_user(role='citizen', **c)
            u.display_id = did
            u.save()

        self.stdout.write('Creating workers (10, all categories, multiple wards)...')

        workers = [
            # Infrastructure
            dict(username='dnyanesh', email='dnyanesh@ichalkaranji.gov.in', password='1234',
                 first_name='Dnyaneshwar', last_name='Jadhav', ward='Ward 5', phone='9543210987',
                 category='Infrastructure', joined_date=date(2023, 1, 10), display_id='W-01'),
            dict(username='prashant', email='prashant@ichalkaranji.gov.in', password='1234',
                 first_name='Prashant', last_name='Shinde', ward='Ward 2', phone='9532109876',
                 category='Infrastructure', joined_date=date(2023, 4, 18), display_id='W-02'),
            # Sanitation
            dict(username='vishwas', email='vishwas@ichalkaranji.gov.in', password='1234',
                 first_name='Vishwas', last_name='Kamble', ward='Ward 3', phone='9432109876',
                 category='Sanitation', joined_date=date(2023, 3, 22), display_id='W-03'),
            dict(username='suresh', email='suresh@ichalkaranji.gov.in', password='1234',
                 first_name='Suresh', last_name='Nikam', ward='Ward 8', phone='9421098765',
                 category='Sanitation', joined_date=date(2023, 7, 5), display_id='W-04'),
            # Water Supply
            dict(username='santosh', email='santosh@ichalkaranji.gov.in', password='1234',
                 first_name='Santosh', last_name='Chougule', ward='Ward 7', phone='9321098765',
                 category='Water Supply', joined_date=date(2023, 6, 5), display_id='W-05'),
            dict(username='ganesh', email='ganesh@ichalkaranji.gov.in', password='1234',
                 first_name='Ganesh', last_name='Pawar', ward='Ward 1', phone='9310987654',
                 category='Water Supply', joined_date=date(2023, 9, 14), display_id='W-06'),
            # Electrical
            dict(username='anil', email='anil@ichalkaranji.gov.in', password='1234',
                 first_name='Anil', last_name='Deshmukh', ward='Ward 5', phone='9210987654',
                 category='Electrical', joined_date=date(2023, 2, 28), display_id='W-07'),
            dict(username='ravi', email='ravi@ichalkaranji.gov.in', password='1234',
                 first_name='Ravi', last_name='Kulkarni', ward='Ward 4', phone='9209876543',
                 category='Electrical', joined_date=date(2023, 11, 3), display_id='W-08'),
            # Traffic Control
            dict(username='mahesh', email='mahesh@ichalkaranji.gov.in', password='1234',
                 first_name='Mahesh', last_name='Gaikwad', ward='Ward 6', phone='9109876543',
                 category='Traffic Control', joined_date=date(2023, 5, 17), display_id='W-09'),
            # Maintenance
            dict(username='prakash', email='prakash@ichalkaranji.gov.in', password='1234',
                 first_name='Prakash', last_name='More', ward='Ward 3', phone='9098765432',
                 category='Maintenance', joined_date=date(2023, 8, 22), display_id='W-10'),
        ]

        for w in workers:
            did = w.pop('display_id')
            u = User.objects.create_user(role='worker', **w)
            u.display_id = did
            u.save()

        self.stdout.write('Creating bins...')
        workers_created = list(User.objects.filter(role='worker').order_by('display_id'))
        create_bins(workers_created)

        self.stdout.write('Creating demo issues...')
        citizens_created = list(User.objects.filter(role='citizen').order_by('display_id'))
        create_issue_records(citizens_created, workers_created)

        self.stdout.write(self.style.SUCCESS(
            '\nSeed complete! Demo users, bins, and issues created.\n\n'
            '  Admin:    admin@cityflow.gov.in         / admin1234\n'
            '  Citizens: rajesh@example.com            / 1234  (Ward 5)\n'
            '            sunita@example.com            / 1234  (Ward 3)\n'
            '            amol@example.com              / 1234  (Ward 7)\n'
            '\n'
            '  Workers (all pw: 1234):\n'
            '    W-01  dnyanesh@ichalkaranji.gov.in   Infrastructure  Ward 5\n'
            '    W-02  prashant@ichalkaranji.gov.in   Infrastructure  Ward 2\n'
            '    W-03  vishwas@ichalkaranji.gov.in    Sanitation      Ward 3\n'
            '    W-04  suresh@ichalkaranji.gov.in     Sanitation      Ward 8\n'
            '    W-05  santosh@ichalkaranji.gov.in    Water Supply    Ward 7\n'
            '    W-06  ganesh@ichalkaranji.gov.in     Water Supply    Ward 1\n'
            '    W-07  anil@ichalkaranji.gov.in       Electrical      Ward 5\n'
            '    W-08  ravi@ichalkaranji.gov.in       Electrical      Ward 4\n'
            '    W-09  mahesh@ichalkaranji.gov.in     Traffic Control Ward 6\n'
            '    W-10  prakash@ichalkaranji.gov.in    Maintenance     Ward 3\n'
        ))
