from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import datetime, timedelta, date

from accounts.models import User
from issues.models import Issue, IssueComment, IssueTimeline
from bins.models import GarbageBin


class Command(BaseCommand):
    help = 'Seed the database with Ichalkaranji demo data for CityFlow'

    def handle(self, *args, **options):
        self.stdout.write('Clearing existing data...')
        IssueTimeline.objects.all().delete()
        IssueComment.objects.all().delete()
        Issue.objects.all().delete()
        GarbageBin.objects.all().delete()
        User.objects.all().delete()

        self.stdout.write('Creating users...')

        # --- Admin ---
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

        # --- Citizens ---
        rajesh = User.objects.create_user(
            username='rajesh',
            email='rajesh@example.com',
            password='1234',
            first_name='Rajesh',
            last_name='Patil',
            role='citizen',
            ward='Ward 5',
            phone='9876543210',
            joined_date=date(2024, 3, 15),
        )
        rajesh.display_id = 'C-01'
        rajesh.save()

        sunita = User.objects.create_user(
            username='sunita',
            email='sunita@example.com',
            password='1234',
            first_name='Sunita',
            last_name='Mane',
            role='citizen',
            ward='Ward 3',
            phone='9765432109',
            joined_date=date(2024, 5, 20),
        )
        sunita.display_id = 'C-02'
        sunita.save()

        amol = User.objects.create_user(
            username='amol',
            email='amol@example.com',
            password='1234',
            first_name='Amol',
            last_name='Kumbhar',
            role='citizen',
            ward='Ward 7',
            phone='9654321098',
            joined_date=date(2024, 7, 10),
        )
        amol.display_id = 'C-03'
        amol.save()

        # --- Workers ---
        dnyanesh = User.objects.create_user(
            username='dnyanesh',
            email='dnyanesh@ichalkaranji.gov.in',
            password='1234',
            first_name='Dnyaneshwar',
            last_name='Jadhav',
            role='worker',
            ward='Ward 5',
            phone='9543210987',
            category='Infrastructure',
            joined_date=date(2023, 1, 10),
        )
        dnyanesh.display_id = 'W-01'
        dnyanesh.save()

        vishwas = User.objects.create_user(
            username='vishwas',
            email='vishwas@ichalkaranji.gov.in',
            password='1234',
            first_name='Vishwas',
            last_name='Kamble',
            role='worker',
            ward='Ward 3',
            phone='9432109876',
            category='Sanitation',
            joined_date=date(2023, 3, 22),
        )
        vishwas.display_id = 'W-02'
        vishwas.save()

        santosh = User.objects.create_user(
            username='santosh',
            email='santosh@ichalkaranji.gov.in',
            password='1234',
            first_name='Santosh',
            last_name='Chougule',
            role='worker',
            ward='Ward 7',
            phone='9321098765',
            category='Water Supply',
            joined_date=date(2023, 6, 5),
        )
        santosh.display_id = 'W-03'
        santosh.save()

        self.stdout.write('Creating issues...')

        now = timezone.now()

        def create_issue(title, description, category, status, ward, location_text,
                         lat, lng, reported_by, assigned_to=None,
                         days_ago=1, upvotes=0,
                         resolved=False, ai_score=None, ai_verdict=''):
            reported_at = now - timedelta(days=days_ago)
            issue = Issue(
                title=title,
                description=description,
                category=category,
                status=status,
                ward=ward,
                location_text=location_text,
                location_lat=lat,
                location_lng=lng,
                reported_by=reported_by,
                assigned_to=assigned_to,
                upvotes=upvotes,
                ai_completion_score=ai_score,
                ai_completion_verdict=ai_verdict,
            )
            issue.reported_at = reported_at  # will be overwritten by auto_now_add; set via update below
            issue.save()  # first save — gets display_id
            # Force reported_at to our desired date
            Issue.objects.filter(pk=issue.pk).update(reported_at=reported_at)
            issue.refresh_from_db()
            # Now compute priority with correct reported_at
            issue.compute_priority_score()
            if assigned_to:
                Issue.objects.filter(pk=issue.pk).update(
                    assigned_at=reported_at + timedelta(hours=4),
                    priority_score=issue.priority_score,
                    priority=issue.priority,
                )
            if resolved:
                Issue.objects.filter(pk=issue.pk).update(
                    resolved_at=reported_at + timedelta(days=2),
                    priority_score=issue.priority_score,
                    priority=issue.priority,
                )
            else:
                Issue.objects.filter(pk=issue.pk).update(
                    priority_score=issue.priority_score,
                    priority=issue.priority,
                )
            if ai_score is not None:
                Issue.objects.filter(pk=issue.pk).update(
                    ai_completion_score=ai_score,
                    ai_completion_verdict=ai_verdict,
                )
            issue.refresh_from_db()
            return issue

        # CP-2001
        i1 = create_issue(
            title='Large Pothole on Rajwada Road',
            description='A deep pothole near Rajwada Chowk is causing accidents. Multiple vehicles have been damaged.',
            category='Road',
            status='In Progress',
            ward='Ward 5',
            location_text='Rajwada Chowk, Ichalkaranji',
            lat=16.6920, lng=74.4633,
            reported_by=rajesh,
            assigned_to=dnyanesh,
            days_ago=5,
            upvotes=14,
        )

        # CP-2002
        i2 = create_issue(
            title='Water Supply Disruption — Kasba Peth',
            description='No water supply for 3 consecutive days in Kasba Peth area. Residents are severely affected.',
            category='Water',
            status='Assigned',
            ward='Ward 3',
            location_text='Kasba Peth, Ichalkaranji',
            lat=16.6950, lng=74.4600,
            reported_by=sunita,
            assigned_to=santosh,
            days_ago=3,
            upvotes=27,
        )

        # CP-2003
        i3 = create_issue(
            title='Street Light Outage — Textile Nagar',
            description='Several street lights on the main road of Textile Nagar have not been working for over a week.',
            category='Electricity',
            status='Resolved',
            ward='Ward 7',
            location_text='Textile Nagar, Ichalkaranji',
            lat=16.6870, lng=74.4550,
            reported_by=amol,
            assigned_to=dnyanesh,
            days_ago=10,
            upvotes=8,
            resolved=True,
            ai_score=91,
            ai_verdict='Street lights confirmed operational in completion photo. High confidence resolution.',
        )

        # CP-2004
        i4 = create_issue(
            title='Overflowing Garbage Bins — Market Area',
            description='Garbage bins near the main market have been overflowing for 4 days. Strong odor and hygiene concern.',
            category='Garbage',
            status='Submitted',
            ward='Ward 2',
            location_text='Main Market, Ichalkaranji',
            lat=16.6900, lng=74.4650,
            reported_by=rajesh,
            days_ago=2,
            upvotes=19,
        )

        # CP-2005
        i5 = create_issue(
            title='Traffic Signal Malfunction — Station Road',
            description='Traffic signal at Station Road junction not functioning properly, causing traffic jams.',
            category='Traffic',
            status='Assigned',
            ward='Ward 1',
            location_text='Station Road Junction, Ichalkaranji',
            lat=16.6940, lng=74.4680,
            reported_by=sunita,
            assigned_to=dnyanesh,
            days_ago=4,
            upvotes=11,
        )

        # CP-2006
        i6 = create_issue(
            title='Broken Public Toilet — Bus Stand',
            description='The public toilet near the bus stand is broken and unusable, causing inconvenience.',
            category='Public Facilities',
            status='Submitted',
            ward='Ward 4',
            location_text='Bus Stand, Ichalkaranji',
            lat=16.6910, lng=74.4620,
            reported_by=amol,
            days_ago=1,
            upvotes=6,
        )

        # CP-2007
        i7 = create_issue(
            title='Road Waterlogging — Mangalwar Peth',
            description='After every rain the road in Mangalwar Peth gets severely waterlogged. Needs proper drainage.',
            category='Road',
            status='Resolved',
            ward='Ward 6',
            location_text='Mangalwar Peth, Ichalkaranji',
            lat=16.6880, lng=74.4590,
            reported_by=rajesh,
            assigned_to=dnyanesh,
            days_ago=14,
            upvotes=22,
            resolved=True,
            ai_score=78,
            ai_verdict='Road surface appears cleared. Some residual waterlogging still visible at edges.',
        )

        # CP-2008
        i8 = create_issue(
            title='Sewage Overflow — Shivaji Nagar',
            description='Sewage line has burst near Shivaji Nagar, causing overflow onto the street.',
            category='Water',
            status='In Progress',
            ward='Ward 3',
            location_text='Shivaji Nagar, Ichalkaranji',
            lat=16.6960, lng=74.4610,
            reported_by=sunita,
            assigned_to=santosh,
            days_ago=2,
            upvotes=33,
        )

        # CP-2009
        i9 = create_issue(
            title='Illegal Dumping Near Panchganga Ghat',
            description='Construction debris and household waste being illegally dumped near the river ghat.',
            category='Garbage',
            status='Submitted',
            ward='Ward 8',
            location_text='Panchganga Ghat, Ichalkaranji',
            lat=16.6830, lng=74.4540,
            reported_by=amol,
            days_ago=1,
            upvotes=9,
        )

        # CP-2010
        i10 = create_issue(
            title='Transformer Sparking — Gandhi Chowk',
            description='Old transformer near Gandhi Chowk is sparking at night. Serious safety hazard.',
            category='Electricity',
            status='Assigned',
            ward='Ward 5',
            location_text='Gandhi Chowk, Ichalkaranji',
            lat=16.6930, lng=74.4645,
            reported_by=rajesh,
            assigned_to=dnyanesh,
            days_ago=3,
            upvotes=17,
        )

        self.stdout.write('Adding comments and timelines...')

        # Comments
        IssueComment.objects.create(issue=i1, user=rajesh, text='I have reported this multiple times. Please fix urgently!')
        IssueComment.objects.create(issue=i1, user=dnyanesh, text='Work order raised. Crew will be there tomorrow.')
        IssueComment.objects.create(issue=i2, user=sunita, text='My family depends on this water supply. Please expedite.')
        IssueComment.objects.create(issue=i2, user=santosh, text='Pipeline inspection underway. Will update soon.')
        IssueComment.objects.create(issue=i3, user=amol, text='Thank you for the quick resolution!')
        IssueComment.objects.create(issue=i8, user=sunita, text='The smell is unbearable. Children are getting sick.')
        IssueComment.objects.create(issue=i10, user=rajesh, text='Heard a loud bang last night. Please check immediately.')

        # Timelines
        def tl(issue, status, note, days_after_report=0):
            entry = IssueTimeline(issue=issue, status=status, note=note)
            entry.save()
            ts = issue.reported_at + timedelta(hours=days_after_report * 24)
            IssueTimeline.objects.filter(pk=entry.pk).update(changed_at=ts)

        tl(i1, 'Submitted', 'Issue reported by citizen.', 0)
        tl(i1, 'Assigned', 'Assigned to Dnyaneshwar Jadhav.', 0.2)
        tl(i1, 'In Progress', 'Repair crew dispatched.', 1)

        tl(i2, 'Submitted', 'Issue reported by citizen.', 0)
        tl(i2, 'Assigned', 'Assigned to Santosh Chougule.', 0.2)

        tl(i3, 'Submitted', 'Issue reported by citizen.', 0)
        tl(i3, 'Assigned', 'Assigned to Dnyaneshwar Jadhav.', 0.2)
        tl(i3, 'In Progress', 'Electrician team deployed.', 1)
        tl(i3, 'Resolved', 'All lights replaced and tested.', 3)

        tl(i4, 'Submitted', 'Issue reported by citizen.', 0)

        tl(i5, 'Submitted', 'Issue reported by citizen.', 0)
        tl(i5, 'Assigned', 'Assigned to Dnyaneshwar Jadhav.', 0.2)

        tl(i6, 'Submitted', 'Issue reported by citizen.', 0)

        tl(i7, 'Submitted', 'Issue reported by citizen.', 0)
        tl(i7, 'Assigned', 'Assigned to Dnyaneshwar Jadhav.', 0.2)
        tl(i7, 'In Progress', 'Drainage work started.', 1)
        tl(i7, 'Resolved', 'Drainage cleared, road restored.', 4)

        tl(i8, 'Submitted', 'Issue reported by citizen.', 0)
        tl(i8, 'Assigned', 'Assigned to Santosh Chougule.', 0.2)
        tl(i8, 'In Progress', 'Sewage repair team on site.', 0.5)

        tl(i9, 'Submitted', 'Issue reported by citizen.', 0)

        tl(i10, 'Submitted', 'Issue reported by citizen.', 0)
        tl(i10, 'Assigned', 'Assigned to Dnyaneshwar Jadhav.', 0.2)

        self.stdout.write('Creating garbage bins...')

        bins_data = [
            ('BIN-01', 'Rajwada Chowk, Ward 5', 'Ward 5', 16.6920, 74.4633, 85, dnyanesh),
            ('BIN-02', 'Main Market, Ward 2', 'Ward 2', 16.6900, 74.4650, 95, vishwas),
            ('BIN-03', 'Kasba Peth, Ward 3', 'Ward 3', 16.6950, 74.4600, 60, vishwas),
            ('BIN-04', 'Textile Nagar, Ward 7', 'Ward 7', 16.6870, 74.4550, 30, None),
            ('BIN-05', 'Station Road, Ward 1', 'Ward 1', 16.6940, 74.4680, 72, vishwas),
            ('BIN-06', 'Panchganga Ghat, Ward 8', 'Ward 8', 16.6830, 74.4540, 55, None),
            ('BIN-07', 'Gandhi Chowk, Ward 5', 'Ward 5', 16.6930, 74.4645, 40, dnyanesh),
            ('BIN-08', 'Shivaji Nagar, Ward 3', 'Ward 3', 16.6960, 74.4610, 88, vishwas),
        ]

        for bin_id, location_text, ward, lat, lng, fill_level, worker in bins_data:
            GarbageBin.objects.create(
                bin_id=bin_id,
                location_text=location_text,
                ward=ward,
                lat=lat,
                lng=lng,
                fill_level=fill_level,
                capacity=500,
                assigned_worker=worker,
                last_collected=now - timedelta(days=2),
            )

        self.stdout.write(self.style.SUCCESS(
            '\nSeed complete!\n'
            '  Admin:   admin@cityflow.gov.in / admin1234\n'
            '  Citizens: rajesh@example.com, sunita@example.com, amol@example.com  (all pw: 1234)\n'
            '  Workers:  dnyanesh@ichalkaranji.gov.in, vishwas@ichalkaranji.gov.in, santosh@ichalkaranji.gov.in  (all pw: 1234)\n'
            '  Issues: CP-2001 to CP-2010\n'
            '  Bins: BIN-01 to BIN-08\n'
        ))
